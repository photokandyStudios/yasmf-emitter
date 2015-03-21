// don't populate the global namespace, but we need some core-js methods
let core = require("core-js/library");

// we need some private variables; get some symbols
let _eventHandlers = core.Symbol("_eventHandlers");

// private methods
function eachEvt(evt, handler, thisArg, cb) {
    "use strict";
    if (evt instanceof Array) {
        evt.forEach(evt => cb(evt, handler, thisArg));
        return true;
    }
    if (typeof evt === "object") {
        let realThisArg = handler;
        Object.entries(evt).forEach(([evt, handler]) => cb(evt, handler, realThisArg));
        return true;
    }
    return false;
}

function tryWrapper(handler, ...args) {
    try {
        handler(...args);
    } catch (err) {
        console.error(`handler received an error: ${err.message}, ${JSON.stringify(err)}`);
    }
}

export class Emitter {
    constructor(options) {
        "use strict";
        // private properties
        this[_eventHandlers] = new core.Map();

        // automatically call our init
        this.init(options);
    }

    init() {
        "use strict";
        console.log(this);
        return this;
    }

    get _eventHandlers() {
        "use strict";
        return this[_eventHandlers];
    }

    on(evt, handler, thisArg) {
        "use strict";
        // allow multiple event types for each handler
        if (eachEvt(evt, handler, thisArg, (..._) => this.on(..._))) return this;
        let eH = this[_eventHandlers];
        // if we don't have an event category, create it as a weak set
        if (!eH.has(evt)) {
            eH.set(evt, new core.Map());
        }
        let objMap = eH.get(evt);
        // check for objects
        if (!objMap.has(thisArg)) {
            objMap.set(thisArg, new core.Set());
        }
        let handlerSet = objMap.get(thisArg);
        // add the handler
        if (typeof handler === "function") {
            handlerSet.add(handler);
        } else {
            throw new TypeError("Event handler must be a function.")
        }

        return this;
    }

    off(evt, handler, thisArg) {
        "use strict";
        // we might have multiple event types as an object or an array
        if (eachEvt(evt, handler, thisArg, (..._) => this.off(..._))) return this;
        // TODO: handle no handler or event
        // only remove if we have the event map in the first place
        let eH = this[_eventHandlers];
        let objMap = eH.get(evt);
        if (objMap !== undefined) {
            let handlerSet = objMap.get(thisArg);
            if (handlerSet !== undefined) {
                handlerSet.delete(handler);
                if (handlerSet.size === 0) {
                    eH.delete(objMap);
                }
            }
        }
    }

    once(evt, handler, thisArg) {
        "use strict";
        let wrapper;
        this.on(evt, wrapper = (...args) => {
            try {
                handler(...args);
            } catch (err) {
                console.error(`ONCE handler received an error: ${err.message}, ${JSON.stringify(err)}`);
            }
            this.off(evt, wrapper, thisArg);
        }, thisArg);
    }

    emitSyncFlag(evt, args, async) {
        "use strict";
        let sender = this;
        let eH = this[_eventHandlers];
        core.Array.from(eH)
            .filter(([potentialEvent]) => {
                console.log(1, potentialEvent);
                if (potentialEvent[0] !== "/") {
                    return potentialEvent === evt;
                } else {
                    let [,exp,flags] = potentialEvent.split("/");
                    return (new RegExp(exp, flags)).test(evt);
                }
            }).forEach(([_,objMap]) => {
                objMap.forEach((handlerSet, thisArg) => {
                    if (handlerSet !== undefined) {
                        handlerSet.forEach(handler => {
                            if (async) {
                                setImmediate(() => {
                                    tryWrapper(handler.bind(thisArg), sender, evt, ...args);
                                });
                            } else {
                                tryWrapper(handler.bind(thisArg), sender, evt, ...args);
                            }
                        });
                    }
                });
            });
    }

    emit(evt, ...args) {
        "use strict";
        this.emitSyncFlag(evt, args, true);

    }

    emitSync(evt, ...args) {
        "use strict";
        this.emitSyncFlag(evt, args, false);
    }

    allOffFor() {
        "use strict";
        //TODO: handle all off for
    }

}
