///require ("core-js/shim");
"use strict";

let should = require("should");

import {Emitter} from "../src/index.js";

describe("Emitter Events", () => {
    describe("Singular on", () => {
        let o = new Emitter();
        let handler;
        o.on("click", handler = (...args) => console.log("args", args), o);
        let eH = o.eventHandlers;
        it("should have exactly one event handler category", () => {
            should(eH).have.length(1);
        });
        it("should have an event handler category of click", () => {
            should(eH[0][0]).be.equal("click");
        });
        let objMap = eH[0][1];
        it("should have the emitter as an object map", () => {
            should(objMap.has(o)).be.equal(true);
        });
        let handlerSet = objMap.get(o);
        it("should have the handler", () => {
            should(handlerSet.has(handler)).be.equal(true);
        });
    });
    describe("Multiple on, using Arrays", () => {
        let o = new Emitter();
        let handler;
        o.on(["click", "tap"], handler = (...args) => console.log("args", args), o);
        let eH = o.eventHandlers;
        it("should have exactly two event handler categories", () => {
            should(eH).have.length(2);
        });
        it("should have an event handler category of click and tap", () => {
            should(eH[0][0]).be.equal("click");
            should(eH[1][0]).be.equal("tap");
        });
        for (let i = 0; i < 2; i++) {
            let objMap = eH[i][1];
            it("should have the emitter as an object map", () => {
                should(objMap.has(o)).be.equal(true);
            });
            let handlerSet = objMap.get(o);
            it("should have the handler", () => {
                should(handlerSet.has(handler)).be.equal(true);
            });
        }
    });
    describe("Multiple on, using Objects", () => {
        let o = new Emitter();
        let evts = {
            click(...args) {
                console.log("click args", args);
            },
            tap(...args) {
                console.log("tap args", args);
            }
        };
        o.on(evts, o);
        let eH = o.eventHandlers;
        it("should have exactly two event handler categories", () => {
            should(eH).have.length(2);
        });
        it("should have an event handler category of click and tap", () => {
            should(eH[0][0]).be.equal("click");
            should(eH[1][0]).be.equal("tap");
        });
        for (let i = 0; i < 2; i++) {
            let objMap = eH[i][1];
            it("should have the emitter as an object map", () => {
                should(objMap.has(o)).be.equal(true);
            });
            let handlerSet = objMap.get(o);
            it("should have the handler", () => {
                should(handlerSet.has(evts[i === 0 ? "click" : "tap"])).be.equal(true);
            });
        }
    });
    describe("Singular on, no binding", () => {
        let o = new Emitter();
        let handler;
        o.on("click", handler = (...args) => console.log("args", args));
        let eH = o.eventHandlers;
        it("should have exactly one event handler category", () => {
            should(eH).have.length(1);
        });
        it("should have an event handler category of click", () => {
            should(eH[0][0]).be.equal("click");
        });
        let objMap = eH[0][1];
        it("should have a map for null; no binding", () => {
            should(objMap.has(null)).be.equal(true);
        });
        let handlerSet = objMap.get(null);
        it("should have the handler", () => {
            should(handlerSet.has(handler)).be.equal(true);
        });
    });
    describe("Synchronous Bound Emit with one handler", () => {
        let o = new Emitter();
        let handler;
        o.on("fire", handler = function (...args) {
            this.called = true
        }, o);
        o.emitSync("fire");
        it("emitter should now have property called set to true.", () => {
            should(o).have.property("called").and.be.equal(true);
        });
    });
    describe("Synchronous Bound Emit with multiple handlers", () => {
        let o = new Emitter();
        o.on("fire", function (...args) { this.called1 = true }, o);
        o.on("fire", function (...args) { this.called2 = false }, o);
        o.on("fire", function (...args) { this.called3 = true }, o);
        o.emitSync("fire");
        it("emitter should now have three properties set to [true,false,true].", () => {
            should(o).have.property("called1").and.be.equal(true);
            should(o).have.property("called2").and.be.equal(false);
            should(o).have.property("called3").and.be.equal(true);
        });
    });
    describe("Synchronous Bound Emit using Once instead of On", () => {
        let o = new Emitter();
        o.called = 0;
        o.once("fire", function (...args) { console.log("fire!"); this.called++; }, o);
        o.emitSync("fire");
        o.emitSync("fire");
        o.emitSync("fire");
        o.emitSync("fire");
        it("emitter should now have property called set to 1.", () => {
            should(o).have.property("called").and.be.equal(1);
        });
    })
});
