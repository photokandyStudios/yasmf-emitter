///require ("core-js/shim");
"use strict";

let should = require("should");

import {Emitter} from "../src/index.js";

function simpleHandler(sender, ...args) {
    this.called = true;
}

class TestEmitter extends Emitter {
    init() {
        super.init();
        this.on("click", this.clicked, this )
    }

    clicked() {
        console.log("clicked!");
        console.log(this);
        this.called = true;
    }
}

describe("BaseObject Events", () => {
    describe("#simple-on", () => {
        let o = new TestEmitter();
        let p = new TestEmitter();
        it("should be a Emittr", () => {
            should(o instanceof Emitter).be.equal(true);
        });
        it("should result in a single event handler", () => {
            //o.on("click", simpleHandler);
            //o.on("click", o.clicked);
            should(o._eventHandlers.size).be.equal(1);
            //should(o.eventHandlers.get("click").has(simpleHandler)).be.equal(true);
        });
        it("simpleHandler should fire when emit is called", () => {
            o.emitSync("click");
            console.log(o.called);
            console.log(p.called);
            should(o.called).be.equal(true);
            should(p.called).be.equal(undefined);
        })
    });
});
