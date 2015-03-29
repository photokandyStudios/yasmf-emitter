"use strict";

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; for (var _iterator = arr[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) { _arr.push(_step.value); if (i && _arr.length === i) break; } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } };

var _toConsumableArray = function (arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } };

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

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

var Emitter = exports.Emitter = (function () {
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
    }

    _prototypeProperties(Emitter, null, {
        init: {
            value: function init() {
                return this;
            },
            writable: true,
            configurable: true
        },
        eventHandlers: {

            /**
             * Returns the event handlers that have been registered.
             * @returns {Array<Map>}
             */
            get: function () {
                return core.Array.from(this[_eventHandlers]);
            },
            configurable: true
        },
        on: {

            /**
             * Registers a handler for one or more events bound to `thisArg`.
             * @param {string|Array<string>|Object} evt
             * @param {function} [handler]
             * @param {Object} [thisArg]
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
                    var _ref;
                    for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
                        _[_key] = arguments[_key];
                    }

                    return (_ref = _this).on.apply(_ref, _);
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
            },
            writable: true,
            configurable: true
        },
        off: {

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
                var _this = this;
                var thisArg = arguments[2] === undefined ? null : arguments[2];
                // handle multiple events appropriately.
                if (eachEvt(evt, handler, thisArg, function () {
                    var _ref;
                    for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
                        _[_key] = arguments[_key];
                    }

                    return (_ref = _this).off.apply(_ref, _);
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
            },
            writable: true,
            configurable: true
        },
        once: {

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
                this.on(evt, wrapper = function () {
                    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                        args[_key] = arguments[_key];
                    }

                    try {
                        handler.apply.apply(handler, [thisArg].concat(args));
                    } catch (err) {
                        console.error("ONCE handler received an error: " + err.message + ", " + JSON.stringify(err));
                    } finally {
                        self.off(evt, wrapper, thisArg);
                    }
                }, thisArg);
            },
            writable: true,
            configurable: true
        },
        emitSyncFlag: {

            /**
             * Emit an event, specifying whether or not the event is synchronous or async.
             *
             * @param {string} evt
             * @param {Array<*>} args
             * @param {boolean} [async]
             */
            value: function emitSyncFlag(evt, args) {
                var async = arguments[2] === undefined ? true : arguments[2];
                var sender = this,
                    eH = this[_eventHandlers];
                core.Array.from(eH)
                // for all the registered event categories, filter out the events that we really care about
                .filter(function (_ref) {
                    var _ref2 = _slicedToArray(_ref, 1);

                    var potentialEvent = _ref2[0];
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
                .forEach(function (_ref) {
                    var _ref2 = _slicedToArray(_ref, 2);

                    var objMap = _ref2[1];
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
            },
            writable: true,
            configurable: true
        },
        emit: {

            /**
             * Emit an **asynchronous** event with optional arguments
             * @param {string} evt
             * @param {*} [args]
             */
            value: function emit(evt) {
                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    args[_key - 1] = arguments[_key];
                }

                this.emitSyncFlag(evt, args, true);
            },
            writable: true,
            configurable: true
        },
        emitSync: {

            /**
             * Emit a **synchronous* event with optional arguments
             * @param {string} evt
             * @param {*} [args]
             */
            value: function emitSync(evt) {
                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    args[_key - 1] = arguments[_key];
                }

                this.emitSyncFlag(evt, args, false);
            },
            writable: true,
            configurable: true
        },
        allOffFor: {

            /**
             * Removes all handlers for all events for the supplied object.
             * @param {Object} o
             * @returns {Emitter}
             */
            value: function allOffFor(o) {
                var eH = this[_eventHandlers];
                for (var _iterator = eH[Symbol.iterator](), _step; !(_step = _iterator.next()).done;) {
                    var _step$value = _slicedToArray(_step.value, 2);

                    var evt = _step$value[0];
                    var objMap = _step$value[1];
                    if (objMap !== undefined) {
                        objMap["delete"](o);
                    }
                }
                return this;
            },
            writable: true,
            configurable: true
        }
    });

    return Emitter;
})();
Object.defineProperty(exports, "__esModule", {
    value: true
});