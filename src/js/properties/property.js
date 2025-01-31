/**
 * <p>
 *  Constructs a ProAct.Property. The properties are simple {@link ProAct.Actor}s with state. The basic property
 *  has a state of a simple value - number/string/boolean.
 * </p>
 * <p>
 *  Every property represents a field in a plain javascript object. It makes it reactive, on reading the property value,
 *  if {@link ProAct.currentCaller} is set, it is added as a listener to the property changes.
 * </p>
 * <p>
 *  Every property has a type the default property has a type of a simple value.
 * </p>
 * <p>
 *  All the properties of an object are managed by its {@link ProAct.ObjectCore}, which is set to a hidden field of the object - '__pro__'.
 * </p>
 * <p>
 *  When created every property is in {@link ProAct.States.init} state, when it is functional, the state is changed to {@link ProAct.States.ready}.
 *  If the property is not in {@link ProAct.States.ready} state, it is not useable.
 * </p>
 * <p>
 *  {@link ProAct.Property#init} is called by this constructor for the property initialization. It should initialize the property and set its state to {@link ProAct.States.ready}.
 * </p>
 * <p>
 *  ProAct.Property is part of the properties module of ProAct.js.
 * </p>
 *
 * @class ProAct.Property
 * @extends ProAct.Actor
 * @param {String} queueName
 *      The name of the queue all the updates should be pushed to.
 *      <p>
 *        If this parameter is null/undefined the default queue of
 *        {@link ProAct.flow} is used.
 *      </p>
 *      <p>
 *        If this parameter is not a string it is used as the
 *        <i>proObject</i>.
 *      </p>
 * @param {Object} proObject
 *      A plain JavaScript object, holding a field, this property will represent.
 * @param {String} property
 *      The name of the field of the object, this property should represent.
 * @param {Function} getter
 *      An optional getter to be used when the property is read. If this parameter is empty, a new {@link ProAct.Property.defaultGetter} is build for <i>this</i>.
 * @param {Function} setter
 *      An optional setter to be used when the property is written. If this parameter is empty, a new {@link ProAct.Property.defaultSetter} is build for <i>this</i>.
 * @see {@link ProAct.ObjectCore}
 * @see {@link ProAct.Property.defaultGetter}
 * @see {@link ProAct.Property.defaultSetter}
 * @see {@link ProAct.Property#init}
 * @see {@link ProAct.States.init}
 * @see {@link ProAct.States.ready}
 */
function Property (queueName, proObject, property, getter, setter) {
  if (queueName && !P.U.isString(queueName)) {
    setter = getter;
    getter = property;
    property = proObject;
    proObject = queueName;
    queueName = null;
  }

  if (!(proObject || property)) {
    property = 'v';
    proObject = {v: null};
  }

  P.U.defValProp(this, 'proObject', false, false, true, proObject);
  this.property = property;

  if (!this.proObject.__pro__) {
    P.U.defValProp(proObject, '__pro__', false, false, true, new ProAct.ObjectCore(proObject));
  }

  this.proObject.__pro__.properties[property] = this;

  this.get = getter || P.P.defaultGetter(this);
  this.set = setter || P.P.defaultSetter(this);

  this.oldVal = null;
  this.val = proObject[property];

  this.g = this.get;
  this.s = this.set;

  P.Actor.call(this, queueName); // Super!
  this.parent = this.proObject.__pro__;

  var meta = this.parent.meta.p;
  this.isStaticTyped = meta && meta.statics && meta.statics.indexOf(this.property) !== -1;
}
ProAct.Property = P.P = Property;

P.U.ex(ProAct.Property, {

  /**
   * Defines the possible types of the ProAct.Property.
   *
   * @namespace ProAct.Property.Types
   */
  Types: {

    /**
     * ProAct.Property for simple types - Numbers, Strings or Booleans.
     *
     * @memberof ProAct.Property.Types
     * @static
     * @constant
     */
    simple: 0, // strings, booleans and numbers

    /**
     * ProAct.Property for auto computed types - Functions.
     *
     * @memberof ProAct.Property.Types
     * @static
     * @constant
     */
    auto: 1, // functions - dependent

    /**
     * ProAct.Property for object types - fields containing objects.
     *
     * @memberof ProAct.Property.Types
     * @static
     * @constant
     */
    object: 2, // references Pro objects

    /**
     * ProAct.Property for array types - fields containing arrays.
     *
     * @memberof ProAct.Property.Types
     * @static
     * @constant
     */
    array: 3, // arrays

    /**
     * ProAct.Property for nil types - fields containing null or undefined.
     *
     * @memberof ProAct.Property.Types
     * @static
     * @constant
     */
    nil: 4, // nulls

    /**
     * Retrieves the right ProAct.Property.Types value from a value.
     *
     * @memberof ProAct.Property.Types
     * @static
     * @param {Object} value
     *      The value to use to compute the ProAct.Property.Types member for.
     * @return {Number}
     *      The type of the passed value.
     */
    type: function (value) {
      if (value === null) {
        return P.P.Types.nil;
      } else if (P.U.isFunction(value)) {
        return P.P.Types.auto;
      } else if (P.U.isArray(value)) {
        return P.P.Types.array;
      } else if (P.U.isObject(value)) {
        return P.P.Types.object;
      } else {
        return P.P.Types.simple;
      }
    }
  },

  /**
   * Generates a default getter function for a ProAct.Property instance.
   * <p>
   *  Every ProAct.Property instance has a getter and a setter, they can be passed in the constructor, but if left blank,
   *  this method is used for creating the getter function.
   * </p>
   * <p>
   *  The default getter function uses {@link ProAct.Property#addCaller} method to track the {@link ProAct.currentCaller} listener if set.
   *  If it is set it is added as a listener to the passed <i>property</i>.
   * </p>
   *
   * @memberof ProAct.Property
   * @static
   * @param {ProAct.Property} property
   *      The ProAct.Property instance to generate a getter function for.
   * @return {Function}
   *      The generated getter function.
   */
  defaultGetter: function (property) {
    return function () {
      property.addCaller();

      return property.val;
    };
  },

  /**
   * Generates a default setter function for a ProAct.Property instance.
   * <p>
   *  Every ProAct.Property instance has a setter and a getter, they can be passed in the constructor, but if left blank,
   *  this method is used for creating the setter function.
   * </p>
   * <p>
   *  The default setter function uses {@link ProAct.Property#update} method to update all the listeners for <i>change</i>s for the passed
   *  <i>property</i>.
   * </p>
   * <p>
   *  It updates the listeners only if the new value of the property is different from the old one (using <i>===</i> for the comparison).
   * </p>
   *
   * @memberof ProAct.Property
   * @static
   * @param {ProAct.Property} property
   *      The ProAct.Property instance to generate a setter function for.
   * @param {Function} setter
   *      A setter function for the way of setting the value. It can be skipped if the value should be set using <i>=</i>.
   * @return {Function}
   *      The generated setter function.
   */
  defaultSetter: function (property, setter) {
    return function (newVal) {
      newVal = P.Actor.transform(property, newVal);
      if (newVal === P.Actor.BadValue || property.val === newVal) {
        return;
      }

      property.oldVal = property.val;
      if (setter) {
        property.val = setter.call(property.proObject, newVal);
      } else {
        property.val = newVal;
      }

      if (property.type() !== P.P.Types.auto && P.P.Types.type(property.val) !== property.type()) {
      //if (property.val === null || property.val === undefined) {
        P.P.reProb(property).update();
        return;
      }

      property.update();
    };
  },

  /**
   * Used to define the managed by a ProAct.Property instance field of the passed <i>obj</i>.
   * <p>
   *  The field is writable, enumerable and configurable.
   * </p>
   *
   * @memberof ProAct.Property
   * @static
   * @param {Object} obj
   *      The object which field should be defined as a property.
   * @param {String} prop
   *      The name of the property field to define.
   * @param {Function} get
   *      The getter that should be used to read the new property to be defined.
   * @param {Function} set
   *      The setter that should be used to update the new property to be defined.
   */
  defineProp: function (obj, prop, get, set) {
    Object.defineProperty(obj, prop, {
      get: get,
      set: set,
      enumerable: true,
      configurable: true
    });
  },

  /**
   * Recreates a property, using its current value.
   * <p>
   *  The re-definition works by using {@link ProAct.Property#destroy} to destroy the passed <i>property</i> first, and then the
   *  {@link ProAct.ObjectCore#makeProp} method is called of the {@link ProAct.ObjectCore} of the object the <i>property</i> belongs to.
   * </p>
   * <p>
   *  This way a new ProAct.Property instance is created to replace the passed one.
   * </p>
   *
   * @memberof ProAct.Property
   * @static
   * @param {ProAct.Property} property
   *      The ProAct.Property instance to re-define.
   * @return {ProAct.Property}
   *      The new re-defined property.
   */
  reProb: function (property) {
	    if (property.isStaticTyped || property.state !== P.States.ready) {
      return;
    }

    var po = property.proObject,
        p = property.property,
        l = property.listeners.change;

    property.destroy();
    return po.__pro__.makeProp(p, l);
  },

  value: function (val, meta, queueName) {
    var property = P.P.lazyValue(val, meta, queueName);
    property.get();

    return property;
  },

  lazyValue: function (val, meta, queueName) {
    if (meta && (P.U.isString(meta) || P.U.isArray(meta))) {
      meta = {
        v: meta
      };
    }

    meta = meta || {};
    meta.p = meta.p || {};
    meta.p.statics = meta.p.statics || ['v'];
    if (queueName) {
      meta.p.queueName = queueName;
    }

    var object = {v: val},
        core = new ObjectCore(object, meta);
    P.U.defValProp(object, '__pro__', false, false, false, core);
    core.prob();

    return core.properties.v;
  }
});

ProAct.Property.prototype = P.U.ex(Object.create(P.Actor.prototype), {

  /**
   * Reference to the constructor of this object.
   *
   * @memberof ProAct.Property
   * @instance
   * @constant
   * @default ProAct.Property
   */
  constructor: ProAct.Property,

  /**
   * Retrieves the {@link ProAct.Property.Types} value of <i>this</i> property.
   * <p>
   *  For instances of the base class - ProAct.Property it is {@link ProAct.Property.Types.simple}.
   * </p>
   *
   * @memberof ProAct.Property
   * @instance
   * @method type
   * @return {Number}
   *      The right type of the property.
   */
  type: function () {
    return P.P.Types.simple;
  },

  /**
   * Creates the <i>event</i> to be send to the listeners of this ProAct.Property on update.
   * <p>
   *  The <i>event</i> should be an instance of {@link ProAct.Event}.
   * </p>
   * <p>
   *  By default this method returns {@link ProAct.Event.Types.value} event with target the property name and arguments:
   *  <ul>
   *    <li>The object this ProAct.Property manages a field for.</li>
   *    <li>The old value of this property.</li>
   *    <li>The new value of this property.</li>
   *  </ul>
   * </p>
   *
   * @memberof ProAct.Property
   * @instance
   * @method makeEvent
   * @default {ProAct.Event} with type {@link ProAct.Event.Types.value}
   * @param {ProAct.Event} source
   *      The source event of the event. It can be null
   * @return {ProAct.ValueEvent}
   *      The event, created.
   */
  makeEvent: function (source) {
    return new P.VE(source, this.property, this.proObject, this.oldVal, this.val);
  },

  /**
   * Creates the <i>listener</i> of this ProAct.Property.
   * <p>
   *  This listener turns the observable in a observer.
   * </p>
   * <p>
   *  The listener for ProAct.Property is an object defining the <i>call</i> method.
   * </p>
   * <p>
   *  It has a <i>property</i> field set to <i>this</i>.
   * </p>
   * <p>
   *  On value changes the <i><this</i> value is set to the new value using the {@link ProAct.Actor#transform} to transform it.
   * </p>
   *
   * @memberof ProAct.Property
   * @instance
   * @method makeListener
   * @return {Object}
   *      The <i>listener of this ProAct.Property</i>.
   */
  makeListener: function () {
    if (!this.listener) {
      var self = this;

      this.listener = {
        property: self,
        queueName: self.queueName,
        call: function (newVal) {
          if (newVal && newVal.type !== undefined && newVal.type === P.E.Types.value && newVal.args.length === 3 && newVal.target) {
            newVal = newVal.args[0][newVal.target];
          }

          self.set(newVal);
        }
      };
    }

    return this.listener;
  },

  /**
   * Initializes this property.
   * <p>
   *  First the property is defined as a field in its object, using {@link ProAct.Property.defineProp}.
   * </p>
   *
   * @memberof ProAct.Property
   * @instance
   * @method doInit
   * @see {@link ProAct.Actor#init}
   */
  doInit: function () {
    P.P.defineProp(this.proObject, this.property, this.get, this.set);
    P.P.defineProp(this, 'v', this.get, this.set);
  },

  /**
   * Uses {@link ProAct.currentCaller} to automatically add a new listener to this property if the caller is set.
   * <p>
   *  This method is used by the default getter to make every reader of the property a listener to it.
   * </p>
   *
   * @memberof ProAct.Property
   * @instance
   * @method addCaller
   */
  addCaller: function () {
    var caller = P.currentCaller;

    if (caller && caller.property !== this) {
      this.on(caller);
    }
  },

  doDestroy: function () {
    delete this.proObject.__pro__.properties[this.property];
    this.oldVal = undefined;

    P.U.defValProp(this.proObject, this.property, true, true, true, this.val);
    this.get = this.set = this.property = this.proObject = undefined;
    this.g = this.s = undefined;
    this.val = undefined;
    this.isStaticTyped = undefined;
    delete this.v;
  },

  map: function (mappingFunction) {
    var prop = P.P.value(this.val, {}, this.queueName).mapping(mappingFunction).into(this);
    this.update();
    return prop;
  },

  filter: function (filteringFunction) {
    var prop = P.P.value(this.val, {}, this.queueName).filtering(filteringFunction).into(this);
    this.update();
    return prop;
  },

  accumulate: function (initVal, accumulationFunction) {
    var prop = P.P.value(this.val, {}, this.queueName).accumulation(initVal, accumulationFunction).into(this);
    this.update();
    return prop;
  },

  /**
   * The <b>toString()</b> method returns a string representing this ProAct.Property.
   * <p>
   *  The string representation is the value of <i>this</i> property.
   * </p>
   *
   * @memberof ProAct.Property
   * @instance
   * @method toString
   */
  toString: function () {
    return this.val + '';
  },

  valueOf: function () {
    return this.val;
  }
});
