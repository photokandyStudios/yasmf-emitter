# YASMF Event Emitter

The YASMF Event Emitter is a general-purpose ES6 event emitter that is also provides the base for many of YASMF's features
(observables, data binding, etc.). You're free to use this event emitter library without using all of YASMF, and there are no
additional dependencies (other than core-js' polyfill).

## Installing

    npm install --save yasmf-emitter

## Importing / Requiring

    let Emitter = require("yasmf-emitter");

or

    import {Emitter} from "yasmf-emitter";

## Using

If you're familiar with event emitters, you should largely feel at home. If you're familiar with any form of `on`/`off` event
registration and handling, you should also feel at home. For those who work solely with the DOM and `addEventListener` and its
ilk, you'll want to mentally translate `addEventListener` to `on` and `removeEventListener` to `off`.

To instantiate an emitter:

    let anEmitter = new Emitter();

The following methods are available:

* `on`: register a handler for an event
* `off`: remove a handler from an event
* `once`: register a handler for an event. It will only be called once; after it is called, it is removed.
* `emit`: Asynchronously emit an event to all handlers.
* `emitSync`: Synchronously emit an event to all handlers.
* `allOffFor`: Removes all handlers for an object

Before you rush in and use these methods, however, you definitely need to be aware of a few things:

* All registration/deregistration methods take a `thisArg` parameter. This allows the handler to be bound to `thisArg` when an
  event is emitted. If you don't specify one, `null` is used instead, and the handler will not have a bound `this` value.
* Registration/deregistration methods can also accept regular expressions posing as strings. For example, `"/change.*/i"` can be used
  to listen for all events starting with `change`. Notice that this isn't a true regular expression -- it's wrapped in quotes. This
  allows you to remove handlers without having to keep a reference to the original regular expression around.
* Handler signatures are of the form `sender, event [, data, ...]`.
* When emitting an event, data can be passed as additional parameters (no limit).
* All handlers are wrapped in a `try`...`catch` which logs errors to the console.
* There is no real concept of namespacing or hierarchies. Using "namespace:level1:level2:level3:..." is idiomatic, but not
  enforced.
* All methods return the emitter, so they can also be chained together.
* Methods named following the pattern `onEvent`, `on:event`, `onevent` on the emitting object will automatically be called.

## Reference

### on( event, handler [, thisArg] )

Registers a handler for the event. The handler will be bound to `thisArg` when the event is emitted.

If the event is a string of the form `"/regular expression/[flags]"`, it will be converted to an actual regular expression when
events are emitted, and the handler will be called if the emitted event matches the regular expression.

If the event is actually an array, `on` is called for each element within the array. For example:

     .on( ["click", "tap"], this.clicked, this );

is equivalent to

     .on( "click", this.clicked, this );
     .on( "tap", this.clicked, this );

If the event is actually an object, `on` is called for each item within the object. For example:

     .on( {
           "click": this.clicked,
           "tap": this.tapped
         }, thisArg );

is equivalent to

     .on( "click", this.clicked, this );
     .on( "tap", this.tapped, this );

### off( [event, [ [,handler] [, thisArg] ] ] )

Removes handlers for an event. If `thisArg` was used when calling `on`, it must also be used when calling `off` (and vice-versa). If
`handler` is not supplied, the method removes __all__ handlers for the object specified by `thisArg`.

If `event` is an object or an array, the same handling occurs as with `on`.

If `event` is specified, but both `handler` and `thisArg` aren't passed, all the handlers for the event are removed.

If no parameters are passed, __all__ events are removed.

    .off( "click", this.clicked, this );  // remove this.clicked from "click"
    .off( "click", this );                // remove all handlers associated with `this` from "click"
    .off( "click" );                      // remove all handlers associated with "click"
    .off();                               // remove all handlers

### allOffFor ( [thisArg] )

Removes handlers for `thisArg` objects. If not specified, `null` is assumed.

    .on( ["click", "tap"], anObject.clicked, anObject );
    .allOffFor(anObject);

### once( event, handler [, thisArg] )

Registers a handler for an event, but the handler will only ever execute once, regardless of the number of events emitted. See
`on` for additional parameter handling.

### emit( event [, data, ...] )

Emits an event to all the handlers, and passes along any optional data. The handler's signature should be of the form
`sender, event [, data, ...]`. The handlers are called asynchronously at the end of the run loop.

    .emit ("click");
    .emit ("tap", "on a button!");

> NOTE: The handlers are wrapped with a `try`...`catch` and errors are logged to the console.

Local event handlers will be called automatically, if they exist. For example:

```
this.emit("tap");
// would check for a handler (in this order) at
// this["on:tap"], this.ontap, this.onTap. The
// first one found is called.

this.emit("user:tapped");
// would check for a handler (in this order) at
// this["on:user:tapped"], this.onuser_tapped, this.onUser_tapped.
// The first one found is called.
// Note that ":" is transformed to "_" in the latter two methods.
```

### emitSync( event [, data, ...] )

Emits an event __synchronously__ to all the handlers, and passes along any optional data. Be careful, as handlers with a lot of
processing may block your user interface or other user interactions.

> NOTE: The handlers are wrapped with a `try`...`catch` and errors are logged to the console.

# Changes

## 0.1.5

* Adds `this["on:" + eventName]` as a local handler name
* Adds `this.oneventname` as a local handler name (vs `this.onEventname`).

## 0.1.4

* Emits `created` event when the base constructor finishes
* Adds `destroy` method for lifecycle management

## 0.1.3

* Updated to Babel 5.x; fixed broken tests
* Emit now calls local onEvent handlers without any registration required

## 0.1.2

* Export Emitter by default
* Bug fixes; tests

## 0.1.1

## 0.1.0

* First public release
