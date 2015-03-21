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

        "use strict";
        // private properties
        this[_eventHandlers] = new core.Map();

        // automatically call our init
        this.init(options);
    }

    _prototypeProperties(Emitter, null, {
        init: {
            value: function init() {
                "use strict";
                console.log(this);
                return this;
            },
            writable: true,
            configurable: true
        },
        _eventHandlers: {
            get: function () {
                "use strict";
                return this[_eventHandlers];
            },
            configurable: true
        },
        on: {
            value: function on(evt, handler, thisArg) {
                var _this = this;
                "use strict";
                // allow multiple event types for each handler
                if (eachEvt(evt, handler, thisArg, function () {
                    var _ref;
                    for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
                        _[_key] = arguments[_key];
                    }

                    return (_ref = _this).on.apply(_ref, _);
                })) {
                    return this;
                }var eH = this[_eventHandlers];
                // if we don't have an event category, create it as a weak set
                if (!eH.has(evt)) {
                    eH.set(evt, new core.Map());
                }
                var objMap = eH.get(evt);
                // check for objects
                if (!objMap.has(thisArg)) {
                    objMap.set(thisArg, new core.Set());
                }
                var handlerSet = objMap.get(thisArg);
                // add the handler
                if (typeof handler === "function") {
                    handlerSet.add(handler);
                } else {
                    throw new TypeError("Event handler must be a function.");
                }

                return this;
            },
            writable: true,
            configurable: true
        },
        off: {
            value: function off(evt, handler, thisArg) {
                var _this = this;
                "use strict";
                // we might have multiple event types as an object or an array
                if (eachEvt(evt, handler, thisArg, function () {
                    var _ref;
                    for (var _len = arguments.length, _ = Array(_len), _key = 0; _key < _len; _key++) {
                        _[_key] = arguments[_key];
                    }

                    return (_ref = _this).off.apply(_ref, _);
                })) {
                    return this;
                } // TODO: handle no handler or event
                // only remove if we have the event map in the first place
                var eH = this[_eventHandlers];
                var objMap = eH.get(evt);
                if (objMap !== undefined) {
                    var handlerSet = objMap.get(thisArg);
                    if (handlerSet !== undefined) {
                        handlerSet["delete"](handler);
                        if (handlerSet.size === 0) {
                            eH["delete"](objMap);
                        }
                    }
                }
            },
            writable: true,
            configurable: true
        },
        once: {
            value: function once(evt, handler, thisArg) {
                var _this = this;
                "use strict";
                var wrapper = undefined;
                this.on(evt, wrapper = function () {
                    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                        args[_key] = arguments[_key];
                    }

                    try {
                        handler.apply(undefined, args);
                    } catch (err) {
                        console.error("ONCE handler received an error: " + err.message + ", " + JSON.stringify(err));
                    }
                    _this.off(evt, wrapper, thisArg);
                }, thisArg);
            },
            writable: true,
            configurable: true
        },
        emitSyncFlag: {
            value: function emitSyncFlag(evt, args, async) {
                "use strict";
                var sender = this;
                var eH = this[_eventHandlers];
                core.Array.from(eH).filter(function (_ref) {
                    var _ref2 = _slicedToArray(_ref, 1);

                    var potentialEvent = _ref2[0];
                    console.log(1, potentialEvent);
                    if (potentialEvent[0] !== "/") {
                        return potentialEvent === evt;
                    } else {
                        var _potentialEvent$split = potentialEvent.split("/");

                        var _potentialEvent$split2 = _slicedToArray(_potentialEvent$split, 3);

                        var exp = _potentialEvent$split2[1];
                        var flags = _potentialEvent$split2[2];
                        return new RegExp(exp, flags).test(evt);
                    }
                }).forEach(function (_ref) {
                    var _ref2 = _slicedToArray(_ref, 2);

                    var _ = _ref2[0];
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
            value: function emit(evt) {
                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    args[_key - 1] = arguments[_key];
                }

                "use strict";
                this.emitSyncFlag(evt, args, true);
            },
            writable: true,
            configurable: true
        },
        emitSync: {
            value: function emitSync(evt) {
                for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    args[_key - 1] = arguments[_key];
                }

                "use strict";
                this.emitSyncFlag(evt, args, false);
            },
            writable: true,
            configurable: true
        },
        allOffFor: {
            value: function allOffFor() {
                "use strict";
                //TODO: handle all off for
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