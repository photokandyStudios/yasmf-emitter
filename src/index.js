"use strict";

// don't populate the global namespace, but we need some core-js methods
let core = require("core-js/library");

// we need some private variables; get some symbols
let _eventHandlers = core.Symbol("_eventHandlers");

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
        evt.forEach(evt => cb(evt, handler, thisArg));
        return true;
    }
    if (typeof evt === "object") {
        let realThisArg = handler;
        if (realThisArg === undefined) { realThisArg = null; }
        Object.entries(evt).forEach(([evt, handler]) => cb(evt, handler, realThisArg));
        return true;
    }
    return false;
}

/**
 * Wraps a try-catch handler around the handler.
 *
 * @param {function} handler
 * @param {*} args
 */
function tryWrapper(handler, ...args) {
    try {
        handler(...args);
    } catch (err) {
        console.error(`handler received an error: ${err.message}, ${JSON.stringify(err)}`);
    }
}

export class Emitter {
    constructor(options) {
        // private properties
        this[_eventHandlers] = new core.Map();

        // method aliases
        this.trigger = this.emit;
        this.triggerSync = this.emitSync;

        // automatically call our init; other objects will eventually be inheriting from
        // this, and `init` is nice to have called automatically
        this.init(options);
    }

    init() {
        return this;
    }

    /**
     * Returns the event handlers that have been registered.
     * @returns {Array<Map>}
     */
    get eventHandlers() {
        return core.Array.from(this[_eventHandlers]);
    }

    /**
     * Registers a handler for one or more events bound to `thisArg`.
     * @param {string|Array<string>|Object} evt
     * @param {function} [handler]
     * @param {Object} [thisArg]
     * @returns {Emitter}
     */
    on(evt, handler, thisArg = null) {

        // if multiple events are passed, call our utility method `eachEvt` to deal with this.
        // if it returns `true`, we should exit, because we're actually being called recursively.
        // If it returns `false`, we're not being called with multiple parameters (this time, anyway),
        // and so can continue processing.
        if (eachEvt(evt, handler, thisArg, (..._) => this.on(..._))) return this;

        // simplify typing; eH = eventHandlers
        let eH = this[_eventHandlers];

        if (!eH.has(evt)) {
            // if we don't have an event category already in the map, create it as a new map
            // this map will be of the form bindingObject:methods.
            eH.set(evt, new core.Map());
        }

        // simplify typing; objMap == objectMap (bindingObject:methods)
        let objMap = eH.get(evt);

        if (!objMap.has(thisArg)) {
            // if we don't have `thisArg` in the map, make a set for it. The set is the set of functions
            // and we use a set so as to prevent duplicates automatically.
            objMap.set(thisArg, new core.Set());
        }
        let handlerSet = objMap.get(thisArg);

        if (typeof handler === "function") {
            // add the handler
            handlerSet.add(handler);
        } else {
            // a little error checking!
            throw new TypeError("Event handler must be a function.")
        }

        return this;
    }

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
    off(evt, handler, thisArg = null) {
        // handle multiple events appropriately.
        if (eachEvt(evt, handler, thisArg, (..._) => this.off(..._))) return this;

        if (evt === undefined && handler === undefined && thisArg === null) {
            // remove all event handlers. Easiest way to do this is just create a new event map
            this[_eventHandlers] = new core.Map();
            return this;
        }

        let eH = this[_eventHandlers];

        if (handler === undefined && thisArg === null) {
            // remove all handlers for a specific event. Easiest way to do this is just create a new object map
            eH.set(evt, new core.Map());
            return this;
        }

        let objMap = eH.get(evt);
        if (objMap !== undefined) {
            // the following cases apply only if we have an object map for the event -- otherwise we do nothing.
            if (typeof handler === "object") {
                // remove all handlers in a given event category for a specific object
                objMap.delete(handler);
                return this;
            }

            // only remove if we have the event map in the first place
            let handlerSet = objMap.get(thisArg);
            if (handlerSet !== undefined) {
                handlerSet.delete(handler);
                if (handlerSet.size === 0) {
                    eH.delete(objMap);
                }
            }
        }

        return this;
    }

    /**
     * Register a handler that will execute once for an event. Otherwise the same as `on`.
     * @param {string|Array<string>|Object} evt
     * @param {function} handler
     * @param {Object} [thisArg]
     */
    once(evt, handler, thisArg = null) {
        let wrapper, self = this;
        this.on(evt, wrapper = function (...args) {
            try {
                handler.apply(thisArg, ...args);
            } catch (err) {
                console.error(`ONCE handler received an error: ${err.message}, ${JSON.stringify(err)}`);
            } finally {
                self.off(evt, wrapper, thisArg);
            }
        }, thisArg);
    }

    /**
     * Emit an event, specifying whether or not the event is synchronous or async.
     *
     * @param {string} evt
     * @param {Array<*>} args
     * @param {boolean} [async]
     */
    emitSyncFlag(evt, args, async = true) {
        let sender = this,
            eH = this[_eventHandlers];
        core.Array.from(eH)
            // for all the registered event categories, filter out the events that we really care about
            .filter(([potentialEvent]) => {
                if (potentialEvent[0] !== "/") {
                    // the event isn't a regexp -- do a direct string compare
                    return potentialEvent === evt;
                } else {
                    // the event IS a regexp. Split on /, which returns an array of [ don't-care, expression, flags ]
                    let [,exp,flags] = potentialEvent.split("/");
                    // Return the result of the new regular expression.
                    // TODO: I suppose we should think about caching the regular expression objects for performance.
                    return (new RegExp(exp, flags)).test(evt);
                }
            })
            // and now we want to call each handler
            .forEach(([,objMap]) => {
                objMap.forEach((handlerSet, thisArg) => {
                    if (handlerSet !== undefined) {
                        handlerSet.forEach(handler => {
                            if (async) {
                                setImmediate(() => { tryWrapper(handler.bind(thisArg), sender, evt, ...args); });
                            } else {
                                tryWrapper(handler.bind(thisArg), sender, evt, ...args);
                            }
                        });
                    }
                });
            });
    }

    /**
     * Emit an **asynchronous** event with optional arguments
     * @param {string} evt
     * @param {*} [args]
     */
    emit(evt, ...args) {
        this.emitSyncFlag(evt, args, true);
    }

    /**
     * Emit a **synchronous* event with optional arguments
     * @param {string} evt
     * @param {*} [args]
     */
    emitSync(evt, ...args) {
        this.emitSyncFlag(evt, args, false);
    }

    /**
     * Removes all handlers for all events for the supplied object.
     * @param {Object} o
     * @returns {Emitter}
     */
    allOffFor(o) {
        let eH = this[_eventHandlers];
        for ( let [evt,objMap] of eH) {
            if (objMap !== undefined) {
                objMap.delete(o);
            }
        }
        return this;
    }

}
