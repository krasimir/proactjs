ProAct.Array = P.A = pArray = function () {
  var self = this,
      getLength, setLength, oldLength,
      arr, core;

  // Setup _array:
  if (arguments.length === 0) {
    arr = [];
  } else if (arguments.length === 1 && P.U.isArray(arguments[0])) {
    arr = arguments[0];
  } else {
    arr = slice.call(arguments);
  }

  P.U.defValProp(this, '_array', false, false, true, arr);

  // Setup core:
  core = new P.AC(this);
  P.U.defValProp(this, '__pro__', false, false, false, core);
  P.U.defValProp(this, 'core', false, false, false, core);
  core.prob();
};

P.U.ex(P.A, {
  Operations: {
    set: 0,
    add: 1,
    remove: 2,
    setLength: 3,
    reverse: 4,
    sort: 5,
    splice: 6,

    isIndexOp: function (op) {
      return op === this.set || op === this.reverse || op === this.sort;
    }
  },
  reFilter: function (original, filtered, filterArgs) {
    var oarr = filtered._array;

    filtered._array = filter.apply(original._array, filterArgs);
    filtered.updateByDiff(oarr);
  }
});
pArrayOps = pArray.Operations;

ProAct.Array.prototype = pArrayProto = P.U.ex(Object.create(arrayProto), {
  constructor: ProAct.Array,
  willUpdateSplice: function (index, spliced, newItems) {
    var listeners, op = pArrayOps.splice;

    if (!spliced || !newItems || (spliced.length === 0 && newItems.length === 0)) {
      return;
    }

    if (spliced.length === newItems.length) {
      listeners = this.__pro__.listeners.index;
    } else if (!newItems.length || !spliced.length) {
      listeners = this.__pro__.listeners.length;
    } else {
      listeners = this.__pro__.listeners.length.concat(this.__pro__.listeners.index);
    }

    this.willUpdateListeners(listeners, op, index, spliced, newItems);
  },
  updateSplice: function (index, sliced, newItems) {
    var _this = this;
    if (P.flow.isRunning()) {
      this.willUpdateSplice(index, sliced, newItems);
    } else {
      P.flow.run(function () {
        _this.willUpdateSplice(index, sliced, newItems);
      });
    }
  },
  willUpdateListeners: function (listeners, op, ind, oldVal, newVal) {
    var length = listeners.length, i, listener,
        event = this.__pro__.makeEvent(null, [op, ind, oldVal, newVal]);

    for (i = 0; i < length; i++) {
      listener = listeners[i];

      if (P.U.isFunction(listener)) {
        P.flow.pushOnce(listener, [event]);
      } else {
        P.flow.pushOnce(listener, listener.call, [event]);
      }

      if (listener.property) {
        listener.property.update(event);
      }
    }
  },
  updateByDiff: function (array) {
    var _this = this,
        j, diff = P.U.diff(array, this._array), cdiff;

    for (j in diff) {
      cdiff = diff[j];
      if (cdiff) {
        _this.updateSplice(j, cdiff.o, cdiff.n);
      }
    }
  },
  concat: function () {
    var res, rightProArray;

    if (arguments.length === 1 && P.U.isProArray(arguments[0])) {
      rightProArray = arguments[0];
      arguments[0] = rightProArray._array;
    }

    res = new P.A(concat.apply(this._array, arguments));
    if (rightProArray) {
      this.__pro__.on(pArrayLs.leftConcat(res, this, rightProArray));
      rightProArray.__pro__.on(pArrayLs.rightConcat(res, this, rightProArray));
    } else {
      this.__pro__.on(pArrayLs.leftConcat(res, this, slice.call(arguments, 0)));
    }

    return res;
  },
  every: function () {
    this.__pro__.addCaller();

    return every.apply(this._array, arguments);
  },
  pevery: function (fun, thisArg) {
    var val = new P.Val(every.apply(this._array, arguments));

    this.__pro__.on(pArrayLs.every(val, this, arguments));

    return val;
  },
  some: function () {
    this.__pro__.addCaller();

    return some.apply(this._array, arguments);
  },
  psome: function (fun, thisArg) {
    var val = new P.Val(some.apply(this._array, arguments));

    this.__pro__.on(pArrayLs.some(val, this, arguments));

    return val;
  },
  forEach: function (fun /*, thisArg */) {
    this.__pro__.addCaller();

    return forEach.apply(this._array, arguments);
  },
  filter: function (fun, thisArg) {
    var filtered = new P.A(filter.apply(this._array, arguments));
    this.__pro__.on(pArrayLs.filter(filtered, this, arguments));

    return filtered;
  },
  map: function (fun, thisArg) {
    var mapped = new P.A(map.apply(this._array, arguments));
    this.__pro__.on(pArrayLs.map(mapped, this, arguments));

    return mapped;
  },
  reduce: function (fun /*, initialValue */) {
    this.__pro__.addCaller();

    return reduce.apply(this._array, arguments);
  },
  preduce: function (fun /*, initialValue */) {
    var val = new P.Val(reduce.apply(this._array, arguments));
    this.__pro__.on(pArrayLs.reduce(val, this, arguments));

    return val;
  },
  reduceRight: function (fun /*, initialValue */) {
    this.__pro__.addCaller();

    return reduceRight.apply(this._array, arguments);
  },
  preduceRight: function (fun /*, initialValue */) {
    var val = new P.Val(reduceRight.apply(this._array, arguments));
    this.__pro__.on(pArrayLs.reduceRight(val, this, arguments));

    return val;
  },
  indexOf: function () {
    this.__pro__.addCaller();

    return indexOf.apply(this._array, arguments);
  },
  pindexOf: function () {
    var val = new P.Val(indexOf.apply(this._array, arguments));
    this.__pro__.on(pArrayLs.indexOf(val, this, arguments));

    return val;
  },
  lastIndexOf: function () {
    this.__pro__.addCaller();

    return lastIndexOf.apply(this._array, arguments);
  },
  plastindexOf: function () {
    var val = new P.Val(lastIndexOf.apply(this._array, arguments));
    this.__pro__.on(pArrayLs.lastIndexOf(val, this, arguments));

    return val;
  },
  join: function () {
    this.__pro__.addCaller();

    return join.apply(this._array, arguments);
  },
  pjoin: function (separator) {
    var reduced = this.preduce(function (i, el) {
      return i + separator + el;
    }, ''), res = new P.Val(function () {
      if (!reduced.v) {
        return '';
      }
      return reduced.v.substring(1);
    });
    return res;
  },
  toLocaleString: function () {
    this.__pro__.addCaller();

    return toLocaleString.apply(this._array, arguments);
  },
  toString: function () {
    this.__pro__.addCaller();

    return toString.apply(this._array, arguments);
  },
  valueOf: function () {
    return this.toArray();
  },
  slice: function () {
    var sliced = new P.A(slice.apply(this._array, arguments));
    this.__pro__.on(pArrayLs.slice(sliced, this, arguments));

    return sliced;
  },
  reverse: function () {
    if (this._array.length === 0) {
      return;
    }
    var reversed = reverse.apply(this._array, arguments), _this = this;

    this.core.update(null, null, [pArrayOps.reverse, -1, null, null]);
    return reversed;
  },
  sort: function () {
    if (this._array.length === 0) {
      return;
    }
    var sorted = sort.apply(this._array, arguments), _this = this,
        args = arguments;

    this.core.update(null, null, [pArrayOps.sort, -1, null, args]);
    return sorted;
  },
  splice: function (index, howMany) {
    var oldLn = this._array.length,
        spliced = splice.apply(this._array, arguments),
        ln = this._array.length, delta,
        _this = this, newItems = slice.call(arguments, 2);

    index = !~index ? ln - index : index
    howMany = (howMany == null ? ln - index : howMany) || 0;

    if (newItems.length > howMany) {
      delta = newItems.length - howMany;
      while (delta--) {
        this.__pro__.defineIndexProp(oldLn++);
      }
    } else if (howMany > newItems.length) {
      delta = howMany - newItems.length;
      while (delta--) {
        delete this[--oldLn];
      }
    }

    _this.updateSplice(index, spliced, newItems);
    return new P.A(spliced);
  },
  pop: function () {
    if (this._array.length === 0) {
      return;
    }
    var popped = pop.apply(this._array, arguments),
        _this = this, index = this._array.length;

    delete this[index];
    this.core.update(null, null, [pArrayOps.remove, _this._array.length, popped, null]);

    return popped;
  },
  push: function () {
    var vals = arguments, i, ln = arguments.length, index,
        _this = this;

    for (i = 0; i < ln; i++) {
      index = this._array.length;
      push.call(this._array, arguments[i]);
      this.__pro__.defineIndexProp(index);
    }

    this.core.update(null, null, [pArrayOps.add, _this._array.length - 1, null, slice.call(vals, 0)]);

    return this._array.length;
  },
  shift: function () {
    if (this._array.length === 0) {
      return;
    }
    var shifted = shift.apply(this._array, arguments),
        _this = this, index = this._array.length;

    delete this[index];
    this.core.update(null, null, [pArrayOps.remove, 0, shifted, null]);

    return shifted;
  },
  unshift: function () {
    var vals = slice.call(arguments, 0), i, ln = arguments.length,
        array = this._array,
        _this = this;
    for (var i = 0; i < ln; i++) {
      array.splice(i, 0, arguments[i]);
      this.__pro__.defineIndexProp(array.length - 1);
    }

    this.core.update(null, null, [pArrayOps.add, 0, null, vals]);

    return array.length;
  },
  toArray: function () {
    var result = [], i, ar = this._array, ln = ar.length, el,
        isPA = P.U.isProArray;

    for (i = 0; i < ln; i++) {
      el = ar[i];
      if (isPA(el)) {
        el = el.toArray();
      }

      result.push(el);
    }

    return result;
  },
  toJSON: function () {
    return JSON.stringify(this._array);
  }
});
