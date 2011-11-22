/*!
 * JavaScript Class Inheritance.
 * https://github.com/percyhanna/js-class
 *
 * Copyright 2011, Sevenlight Inc.
 * Licensed under the MIT license.
 * https://github.com/percyhanna/js-class/blob/master/LICENSE
 */

(function(exports) {
    var slice = Array.prototype.slice;

    Array.fromArguments = function(args) {
        return slice.apply(args);
    };

    Object.extend = function() {
        var src = Array.fromArguments(arguments),
            dst = src.shift(),
            i = 0;
        for (; i < src.length; ++i) {
            for (var name in src[i]) {
                dst[name] = src[i][name];
            }
        }
    };

    Object.extend(Object, {
        isKindOfClass: function(a, b) {
            var aConstructor = Object.classFromObject(a),
                bConstructor = Object.classFromObject(b);

            if (aConstructor === null || bConstructor === null) {
                return false;
            }

            if (aConstructor === bConstructor) {
                return true;
            }

            if (aConstructor.superclass) {
                return Object.isKindOfClass(aConstructor.superclass, b);
            }

            return false;
        },
        
        isArray: function(a) {
            return this.isKindOfClass(a, Array);
        },

        isFunction: function(obj) {
            return typeof obj === 'function'
                || Object.isA(obj, Function);
        },

        each: function(obj, cb) {
            for (var name in obj) {
                cb.apply(obj[name], [name, obj[name]]);
            }
        },

        keys: function(obj) {
            var keys = [];
            for (var name in obj) {
                if (obj.hasOwnProperty(name)) {
                    keys.push(name);
                }
            }
            return keys;
        },

        classFromObject: function(obj) {
            if (typeof obj !== 'object' && typeof obj !== 'function') {
                return null;
            } else if (obj.constructor && obj.constructor !== Function) {
                return obj.constructor;
            } else if (typeof obj === 'function') {
                return obj;
            } else {
                return null;
            }
        },

        implements: function(obj, trait) {
            if (typeof obj !== 'object'
                || !obj._traits
                || !obj.constructor
                || !obj.constructor.prototype._traits
            ) {
                return false;
            }

            // if the prototype implements it but this object doesn't implement it, then let's auto load it
            if (_obj.prototype._traits.indexOf(trait) !== -1) {
                if (!_obj._traits || _obj._traits.indexOf(trait) === -1) {
                    // auto load
                    trait.implementObject(obj);
                }
                return true;
            }
            return false;
        }
    });

    Object.isA = Object.isKindOfClass;

    Object.extend(String.prototype, {
        isEmpty: function() {
            return /^\s*$/.test(this);
        }
    });

    var InstanceMethods = {
        $S: function(ae) {
            var args = Array.fromArguments(arguments).slice(1);
            return (ae.callee.$super.bind(this)).apply(this, args);
        }
    };
    var StaticMethods = {
        detect: function(obj) {
            return Object.isKindOfClass(obj, this);
        }
    };

    Object.extend(Function.prototype, {
        meta: function(name) {
            if (name) {
                return this._meta ? this._meta[name] : null;
            }
            this._meta = this._meta || {};
            return this._meta;
        },
        
        bind: function(scope) {
            var __method = this,
                args;
            if (arguments.length > 1) {
                args = Array.fromArguments(arguments).slice(1);
                return function() {
                    var innerArgs = args.concat(Array.fromArguments(arguments));
                    return __method.apply(scope, innerArgs);
                };
            } else {
                return function() {
                    return __method.apply(scope, Array.fromArguments(arguments));
                };
            }
        },
        
        final: function() {
            this.meta().final = true;
            return this;
        }
    });

    Array.prototype.each = function(cb) {
        var args = Array.fromArguments(arguments).slice(1);
        for (var i = 0; i < this.length; ++i) {
            if (cb.apply(this[i], [this[i], i].concat(args)) === false) {
                break;
            }
        }
    };

    function subclass() {};
    
    function createClassMeta(klass) {
        klass.classMeta = {
            finalMethods: {}
        };
    }

    exports.create = function() {
        var args = Array.fromArguments(arguments),
            superclass = null,
            methods,
            method,
            dynamicConstructor = function() {},
            abstract = false,
            klass = function() {
                if (!abstract && arguments.length === 1 && arguments[0] === dynamicConstructor) {
                    return;
                } else if (!abstract && typeof this.initialize === 'function') {
                    this.initialize.apply(this, Array.fromArguments(arguments));
                } else {
                    console.log(abstractMethods);
                    var abstractMethods = Object.keys(this.constructor._abstractMethods);
                    console.log(this.constructor._abstractMethods);
                    throw new Error('Cannot instantiate instance of abstract class.' + (abstractMethods.length > 0 ? ' ' + abstractMethods.join(', ') : ''));
                }
            },
            proto;

        // super class?
        klass._abstractMethods = {};
        klass._staticMethods = {};
        if (typeof args[0] === 'function') {
            // copy over parent class's prototype
            klass.superclass = superclass = args.shift();
            Object.extend(klass.prototype, superclass.prototype);
            Object.extend(klass._abstractMethods, superclass._abstractMethods);
        }

        // dynamic constructor
        proto = klass.prototype;
        klass.prototype.constructor = klass;
        klass.DynamicConstructor = function() {
            var obj = new this(dynamicConstructor);
            obj.initialize.apply(obj, Array.fromArguments(arguments));
            return obj;
        }.bind(klass);

        // add common methods
        Object.extend(klass.prototype, InstanceMethods);
        Object.extend(klass, StaticMethods);

        // loop through methods
        if (typeof args[0] === 'object') {
            methods = args[0];
            args = args.slice(1);
            for (var name in methods) {
                if (!methods.hasOwnProperty(name)) {
                    continue;
                }
                method = methods[name];
                if (method === null) {
                    abstract = true;
                    klass._abstractMethods[name] = true;
                    continue;
                }
                if (superclass) {
                    if (typeof superclass.prototype[name] === 'function') {
                        if (superclass.prototype[name].meta('final')) {
                            throw new Error('Cannot extend final method ' + name);
                        }
                        method.$super = superclass.prototype[name];
                    } else if (superclass._abstractMethods[name] === true) {
                        delete klass._abstractMethods[name];
                    }
                }
                proto[name] = method;
            }
        }

        // static methods?
        if (typeof args[0] === 'object') {
            methods = args[0];
            for (var name in methods) {
                if (!methods.hasOwnProperty(name)) {
                    continue;
                }
                method = methods[name];
                if (superclass && typeof superclass[name] === 'function') {
                    method.$super = superclass[name];
                }
                if (typeof method === 'function') {
                    klass[name] = method.bind(klass);
                    klass._staticMethods[name] = method;
                } else {
                    klass[name] = method;
                }
            }
        }

        // parent's static methods
        if (superclass && superclass._staticMethods) {
            Object.each(superclass._staticMethods, function(name, method) {
                if (Object.isFunction(method)) {
                    klass[name] = method.bind(klass);
                    klass._staticMethods[name] = method;
                }
            });
        }
        
        // last abstract check
        abstract = Object.keys(klass._abstractMethods).length > 0;
        if (abstract) {
            console.lg(klass._abstractMethods);
        }

        // return class
        return klass;
    };
})(typeof exports === 'undefined' ? this['Class'] = {} : exports);
