/**
 * <p>
 *  Constructs a ProAct.Stream. The stream is a simple {@link ProAct.Observable}, without state.
 * </p>
 * <p>
 *  The streams are ment to emit values, events, changes and can be plugged into another observables.
 *  For example you can connect many streams, to merge them and to divide them, to plug them into properties.
 * </p>
 * <p>
 *  The reactive environment consists of the properties and the objects containing them, but
 *  the outside world is not reactive. It is possible to use the ProAct.Streams as connections from the
 *  outside world to the reactive environment.
 * </p>
 * <p>
 *    The transformations can be used to change the events or values emitetted.
 * </p>
 * <p>
 *  ProAct.Stream is part of the streams module of ProAct.js.
 * </p>
 *
 * @class ProAct.Stream
 * @extends ProAct.Observable
 * @param {ProAct.Observable} source
 *      A devfault source of the stream, can be null.
 * @param {Array} transforms
 *      A list of transformation to be used on all incoming chages.
 */
ProAct.Stream = ProAct.S = function (source, transforms) {
  P.Observable.call(this, transforms);

  if (source) {
    this.into(source);
  }
};

ProAct.Stream.prototype = P.U.ex(Object.create(P.Observable.prototype), {

  /**
   * Reference to the constructor of this object.
   *
   * @memberof ProAct.Stream
   * @instance
   * @constant
   * @type {Object}
   * @default ProAct.Stream
   */
  constructor: ProAct.Stream,

  /**
   * Creates the <i>event</i> to be send to the listeners on update.
   * <p>
   *  Streams don't create new events by default, the event is the source.
   * </p>
   *
   * @memberof ProAct.Stream
   * @instance
   * @method makeEvent
   * @param {ProAct.Event} source
   *      The source event of the event. It can be null
   * @return {ProAct.Event}
   *      The event.
   */
  makeEvent: function (source) {
    return source;
  },

  /**
   * Creates the <i>listener</i> of this stream.
   * <p>
   *  The listener of the stream just calls the method {@link ProAct.Stream#trigger} with the incoming event/value.
   * </p>
   *
   * @memberof ProAct.Stream
   * @instance
   * @method makeListener
   * @return {Object}
   *      The <i>listener of this stream</i>.
   */
  makeListener: function () {
    if (!this.listener) {
      var stream = this;
      this.listener = function (event) {
        stream.trigger(event, true);
      };
    }

    return this.listener;
  },

  /**
   * Creates the <i>error listener</i> of this stream.
   * <p>
   *  The listener just calls {@link ProAct.Stream#triggerErr} of <i>this</i> with the incoming error.
   * </p>
   *
   * @memberof ProAct.Stream
   * @instance
   * @method makeErrListener
   * @return {Object}
   *      The <i>error listener of this stream</i>.
   */
  makeErrListener: function () {
    if (!this.errListener) {
      var stream = this;
      this.errListener = function (error) {
        stream.triggerErr(error);
      };
    }

    return this.errListener;
  },

  defer: function (event, listener) {
    if (listener.property) {
      P.Observable.prototype.defer.call(this, event, listener);
      return;
    }

    if (P.U.isFunction(listener)) {
      P.flow.push(listener, [event]);
    } else {
      P.flow.push(listener, listener.call, [event]);
    }
  },
  trigger: function (event, useTransformations) {
    if (useTransformations === undefined) {
      useTransformations = true;
    }
    return this.go(event, useTransformations);
  },
  triggerErr: function (err) {
    return this.update(err, this.errListeners);
  },
  go: function (event, useTransformations) {
    var i, tr = this.transforms, ln = tr.length;

    if (useTransformations) {
      try {
        event = P.Observable.transform(this, event);
      } catch (e) {
        this.triggerErr(e);
        return this;
      }
    }

    if (event === P.Observable.BadValue) {
      return this;
    }

    return this.update(event);
  },
  map: function (f) {
    return new P.S(this).mapping(f);
  },
  filter: function (f) {
    return new P.S(this).filtering(f);
  },
  accumulate: function (initVal, f) {
    return new P.S(this).accumulation(initVal, f);
  },
  merge: function (stream) {
    return new P.S().into(this, stream);
  }
});

P.U.ex(P.F.prototype, {
  errStream: function () {
    if (!this.errStreamVar) {
      this.errStreamVar = new P.S();
    }

    return this.errStreamVar;
  }
});
