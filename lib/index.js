"use strict";

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
"use strict";

// don't populate the global namespace, but we need some core-js methods
var core = require("core-js/library");

// we need some private variables; get some symbols
var _eventHandlers = core.Symbol("_eventHandlers");

// private methods

/**
 * Utility method for iterating over multiple events in `on`, `off`, etc. If `evt` is an array,
 * the callback is executed passing each item as `evt`, and passing `handler` and `thisArg` from
 * the caller. If it is an object, however, the `evt` is the key and the `handler` is derived from
 * the value in `evt[key]`. The `thisArg` is passed from the caller.
 *
 * @param {Array<string>|Object<function>} evt
 * @param {function} handler
 * @param {Object} thisArg
 * @param {function} cb
 * @returns {boolean} if `true`, `evt` was an array or object. If `false`, it wasn't.
 */
function eachEvt(evt, handler, thisArg, cb) {
    "use strict";
    if (evt instanceof Array) {
        evt.forEach(function (evt) {
            return cb(evt, handler, thisArg);
        });
        return true;
    }
    if (typeof evt === "object") {
        var _ret = (function () {
            var realThisArg = handler;
            if (realThisArg === undefined) {
                realThisArg = null;
            }
            Object.entries(evt).forEach(function (_ref) {
                var _ref2 = _slicedToArray(_ref, 2);

                var evt = _ref2[0];
                var handler = _ref2[1];
                return cb(evt, handler, realThisArg);
            });
            return {
                v: true
            };
        })();

        if (typeof _ret === "object") {
            return _ret.v;
        }
    }
    return false;
}

/**
 * Wraps a try-catch handler around the handler.
 *
 * @param {function} handler
 * @param {*} args
 */
function tryWrapper(handler) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
    }

    try {
        handler.apply(undefined, args);
    } catch (err) {
        console.error("handler received an error: " + err.message + ", " + JSON.stringify(err));
    }
}

var Emitter = (function () {
    function Emitter(options) {
        _classCallCheck(this, Emitter);

        // private properties
        this[_eventHandlers] = new core.Map();

        // method aliases
        this.trigger = this.emit;
        this.triggerSync = this.emitSync;

        // automatically call our init; other objects will eventually be inheriting from
        // this, and `init` is nice to have called automatically
        this.init(options);

        // let any handlers know too.
        this.emit("created", options);
    }

    _createClass(Emitter, [{
        key: "init",
        value: function init() {
            return this;
        }
    }, {
        key: "eventHandlers",

        /**
         * Returns the event handlers that have been registered.
         * @returns {Array<Map>}
         */
        get: function () {
            return core.Array.from(this[_eventHandlers]);
        }
    }, {
        key: "on",

        /**
         * Registers a handler for one or more events bound to `thisArg`.
         * @param {string|Array<string>|Object} evt
         * @param {function} [handler]
         * @param {Object} [thisArg]
         * @throws {TypeError}
         * @returns {Emitter}
         */
        value: function on(evt, handler) {
            var _this = this;

            var thisArg = arguments[2] === undefined ? null : arguments[2];

            // if multiple events are passed, call our utility method `eachEvt` to deal with this.
            // if it returns `true`, we should exit, because we're actually being called recursively.
            // If it returns `false`, we're not being called with multiple parameters (this time, anyway),
            // and so can continue processing.
            if (eachEvt(evt, handler, thisArg, function () {
                for (var _len2 = arguments.length, _ = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    _[_key2] = arguments[_key2];
                }

                return _this.on.apply(_this, _);
            })) {
                return this;
            } // simplify typing; eH = eventHandlers
            var eH = this[_eventHandlers];

            if (!eH.has(evt)) {
                // if we don't have an event category already in the map, create it as a new map
                // this map will be of the form bindingObject:methods.
                eH.set(evt, new core.Map());
            }

            // simplify typing; objMap == objectMap (bindingObject:methods)
            var objMap = eH.get(evt);

            if (!objMap.has(thisArg)) {
                // if we don't have `thisArg` in the map, make a set for it. The set is the set of functions
                // and we use a set so as to prevent duplicates automatically.
                objMap.set(thisArg, new core.Set());
            }
            var handlerSet = objMap.get(thisArg);

            if (typeof handler === "function") {
                // add the handler
                handlerSet.add(handler);
            } else {
                // a little error checking!
                throw new TypeError("Event handler must be a function.");
            }

            return this;
        }
    }, {
        key: "off",

        /**
         * Removes handlers from an event. This one is a bit complicated, because it supports various
         * overloads that do slightly different things.
         *
         * * If `evt`, `handler`, and `thisArg` are supplied, the handler is removed as would be expected.
         *   If no `thisArg` is supplied, the `handler` is removed from the `null` category.
         * * If `handler` is an object and not a method, it is assumed to be `thisArg`. With no handlers
         *   specified to remove, _all_ handlers within the object map are removed.
         * * If only an `evt` is specified, all handlers and objects are removed.
         * * If no parameters are supplied, all handlers are removed for all events.
         *
         * @param {string|Array<string>|Object} [evt]
         * @param {function|Object} [handler]
         * @param {Object} [thisArg]
         * @returns {Emitter}
         */
        value: function off(evt, handler) {
            var _this2 = this;

            var thisArg = arguments[2] === undefined ? null : arguments[2];

            // handle multiple events appropriately.
            if (eachEvt(evt, handler, thisArg, function () {
                for (var _len3 = arguments.length, _ = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
                    _[_key3] = arguments[_key3];
                }

                return _this2.off.apply(_this2, _);
            })) {
                return this;
            }if (evt === undefined && handler === undefined && thisArg === null) {
                // remove all event handlers. Easiest way to do this is just create a new event map
                this[_eventHandlers] = new core.Map();
                return this;
            }

            var eH = this[_eventHandlers];

            if (handler === undefined && thisArg === null) {
                // remove all handlers for a specific event. Easiest way to do this is just create a new object map
                eH.set(evt, new core.Map());
                return this;
            }

            var objMap = eH.get(evt);
            if (objMap !== undefined) {
                // the following cases apply only if we have an object map for the event -- otherwise we do nothing.
                if (typeof handler === "object") {
                    // remove all handlers in a given event category for a specific object
                    objMap["delete"](handler);
                    return this;
                }

                // only remove if we have the event map in the first place
                var handlerSet = objMap.get(thisArg);
                if (handlerSet !== undefined) {
                    handlerSet["delete"](handler);
                    if (handlerSet.size === 0) {
                        eH["delete"](objMap);
                    }
                }
            }

            return this;
        }
    }, {
        key: "once",

        /**
         * Register a handler that will execute once for an event. Otherwise the same as `on`.
         * @param {string|Array<string>|Object} evt
         * @param {function} handler
         * @param {Object} [thisArg]
         */
        value: function once(evt, handler) {
            var thisArg = arguments[2] === undefined ? null : arguments[2];

            var wrapper = undefined,
                self = this;
            // add a wrapper around the handler and listen to the requested event
            this.on(evt, wrapper = function () {
                for (var _len4 = arguments.length, args = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
                    args[_key4] = arguments[_key4];
                }

                try {
                    handler.apply.apply(handler, [thisArg].concat(args));
                } catch (err) {
                    console.error("ONCE handler received an error: " + err.message + ", " + JSON.stringify(err));
                } finally {
                    // remove the wrapper so that the event doesn't call us again
                    self.off(evt, wrapper, thisArg);
                }
            }, thisArg);
        }
    }, {
        key: "emitSyncFlag",

        /**
         * Emit an event, specifying whether or not the event is synchronous or async.
         *
         * @param {string} evt
         * @param {Array<*>} args
         * @param {boolean} [async]
         */
        value: function emitSyncFlag(evt, args) {
            var _this3 = this;

            var async = arguments[2] === undefined ? true : arguments[2];

            var sender = this,
                eH = this[_eventHandlers];

            // emit locally first to onEvent handlers
            try {
                (function () {
                    var onEvent = "on:" + evt,
                        sanitizedEvent = evt.replace(/\:/g, "_"),
                        onSanitizedEvent = "on" + sanitizedEvent,
                        ProperEventCase = sanitizedEvent[0].toUpperCase() + sanitizedEvent.substr(1),
                        onProperEventCase = "on" + ProperEventCase,
                        localHandler = undefined;

                    if (_this3[onEvent]) {
                        localHandler = _this3[onEvent];
                    } else if (_this3[onSanitizedEvent]) {
                        localHandler = _this3[onSanitizedEvent];
                    } else if (_this3[onProperEventCase]) {
                        localHandler = _this3[onProperEventCase];
                    }
                    if (localHandler) {
                        if (async) {
                            setImmediate(function () {
                                tryWrapper.apply(undefined, [localHandler.bind(sender), sender, evt].concat(_toConsumableArray(args)));
                            });
                        } else {
                            tryWrapper.apply(undefined, [localHandler.bind(sender), sender, evt].concat(_toConsumableArray(args)));
                        }
                    }
                })();
            } catch (err) {
                console.log("EMITTER WARNING: Something broke while trying to call local methods.", err);
            }

            core.Array.from(eH)
            // for all the registered event categories, filter out the events that we really care about
            .filter(function (_ref3) {
                var _ref32 = _slicedToArray(_ref3, 1);

                var potentialEvent = _ref32[0];

                if (potentialEvent[0] !== "/") {
                    // the event isn't a regexp -- do a direct string compare
                    return potentialEvent === evt;
                } else {
                    // the event IS a regexp. Split on /, which returns an array of [ don't-care, expression, flags ]

                    var _potentialEvent$split = potentialEvent.split("/");

                    var _potentialEvent$split2 = _slicedToArray(_potentialEvent$split, 3);

                    var exp = _potentialEvent$split2[1];
                    var flags = _potentialEvent$split2[2];

                    // Return the result of the new regular expression.
                    // TODO: I suppose we should think about caching the regular expression objects for performance.
                    return new RegExp(exp, flags).test(evt);
                }
            })
            // and now we want to call each handler
            .forEach(function (_ref4) {
                var _ref42 = _slicedToArray(_ref4, 2);

                var objMap = _ref42[1];

                objMap.forEach(function (handlerSet, thisArg) {
                    if (handlerSet !== undefined) {
                        handlerSet.forEach(function (handler) {
                            if (async) {
                                setImmediate(function () {
                                    tryWrapper.apply(undefined, [handler.bind(thisArg), sender, evt].concat(_toConsumableArray(args)));
                                });
                            } else {
                                tryWrapper.apply(undefined, [handler.bind(thisArg), sender, evt].concat(_toConsumableArray(args)));
                            }
                        });
                    }
                });
            });
        }
    }, {
        key: "emit",

        /**
         * Emit an **asynchronous** event with optional arguments
         * @param {string} evt
         * @param {*} [args]
         */
        value: function emit(evt) {
            for (var _len5 = arguments.length, args = Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
                args[_key5 - 1] = arguments[_key5];
            }

            this.emitSyncFlag(evt, args, true);
        }
    }, {
        key: "emitSync",

        /**
         * Emit a **synchronous* event with optional arguments
         * @param {string} evt
         * @param {*} [args]
         */
        value: function emitSync(evt) {
            for (var _len6 = arguments.length, args = Array(_len6 > 1 ? _len6 - 1 : 0), _key6 = 1; _key6 < _len6; _key6++) {
                args[_key6 - 1] = arguments[_key6];
            }

            this.emitSyncFlag(evt, args, false);
        }
    }, {
        key: "allOffFor",

        /**
         * Removes all handlers for all events for the supplied object.
         * @param {Object} o
         * @returns {Emitter}
         */
        value: function allOffFor(o) {
            var eH = this[_eventHandlers];
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = eH[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _step$value = _slicedToArray(_step.value, 2);

                    var evt = _step$value[0];
                    var objMap = _step$value[1];

                    if (objMap !== undefined) {
                        objMap["delete"](o);
                    }
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator["return"]) {
                        _iterator["return"]();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            return this;
        }
    }, {
        key: "destroy",

        /**
         * Destroys the object; removes all handlers
         */
        value: function destroy() {
            this[_eventHandlers] = null;
        }
    }]);

    return Emitter;
})();

exports["default"] = Emitter;
module.exports = exports["default"];