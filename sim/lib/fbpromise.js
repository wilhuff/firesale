/**
 * Promisifies the Firebase API.
 */

var callbacks = require('when/callbacks');
var nodefn = require('when/node');
var when = require('when');


function PromisedFirebase(delegate) {
  this.delegate = delegate;
}

PromisedFirebase.prototype.path = function() {
  var root = this.delegate.root().toString();
  var full = this.delegate.toString();

  var start = root.length;
  while (start < full.length && full.charAt(start) === '/') {
    start += 1;
  }
  return full.substring(start)
}

// Methods documented as Firebase methods
proxy(PromisedFirebase, {
  child: wrap,
  parent: wrap,
  root: wrap,
  key: direct,
  toString: direct,
  set: nodeOnComplete,
  update: nodeOnComplete,
  remove: nodeOnComplete,
  push: nodeOnComplete,
  setWithPriority: nodeOnComplete,
  setPriority: nodeOnComplete
});

PromisedFirebase.prototype.transaction = function(updateFunction, applyLocally) {
  var fb = this.delegate;
  return onCompletePromise(function(onComplete) {
    fb.transaction(updateFunction, onComplete, applyLocally);
  });
};

// Methods documented as Query methods
proxy(PromisedFirebase, {
  // on: custom,
  off: direct,
  once: callbacksSnapshot,
  orderByChild: wrap,
  orderByKey: wrap,
  orderByPriority: wrap,
  startAt: wrap,
  endAt: wrap,
  equalTo: wrap,
  limitToFirst: wrap,
  limitToLast: wrap,
  limit: wrap,
  ref: returnThis
});

PromisedFirebase.prototype.on = function(eventType, callback, cancelCallback, context) {
  this.delegate.on(eventType, function(snapshot) {
    return callback(new PromisedDataSnapshot(snapshot));
  }, cancelCallback, context);
}

function PromisedDataSnapshot(delegate) {
  this.delegate = delegate;
}

proxy(PromisedDataSnapshot, {
  exists: direct,
  val: direct,
  child: wrap,
  // forEach: custom,
  hasChild: direct,
  hasChildren: direct,
  key: direct,
  numChildren: direct,
  ref: wrapFirebase,
  getPriority: direct,
  exportValue: direct
});

PromisedDataSnapshot.prototype.forEach = function(childAction) {
  return this.delegate.forEach(function(child) {
    return childAction(new PromisedDataSnapshot(child));
  });
};

/**
 * Creates a new method on the given type's prototype that wraps the result of the given method
 * in a new instance of the type. Suitable for navigation methods like child and parent where the
 * type of `this` and the type of the return value are the same.
 *
 * @param type the type to modify
 * @param method the name of the method to create as a wrapper
 * @param wrapperType the type to wrap the result in, or undefined to use type
 */
function wrap(type, method, wrapperType) {
  if (wrapperType === undefined) {
    wrapperType = type;
  }
  type.prototype[method] = function() {
    return new wrapperType(this.$apply(method, arguments));
  }
}

function wrapFirebase(type, method) {
  return wrap(type, method, PromisedFirebase);
}

/**
 * Creates a new method on the given types prototype that directly returns the result of the given
 * method applied
 * @param type
 * @param method
 */
function direct(type, method) {
  type.prototype[method] = function() {
    return this.$apply(method, arguments);
  }
}

function returnThis(type, method) {
  type.prototype[method] = function() {
    return this;
  }
}

function nodeOnComplete(type, method) {
  type.prototype[method] = function() {
    var bound = this.delegate[method].bind(this.delegate);
    return nodefn.apply(bound, arguments)
      .yield(arguments[0]);
  }
}

function callbacksSnapshot(type, method) {
  type.prototype[method] = function() {
    var bound = this.delegate[method].bind(this.delegate);
    return callbacks.apply(bound, arguments)
      .then(function(value) {
        return new PromisedDataSnapshot(value);
      });
  };
}

function proxy(type, methods) {
  type.prototype.$apply = apply;
  for (var method in methods) {
    if (methods.hasOwnProperty(method)) {
      var proxyFactory = methods[method];
      proxyFactory.call(undefined, type, method);
    }
  }
}

function apply(method, arguments) {
  var fn = this.delegate[method];
  return fn.apply(this.delegate, arguments);
}

function onCompletePromise(action) {
  var deferred = when.defer();
  action(function(err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(arguments[1]);
    }
  });
  return deferred.promise;
}

module.exports = PromisedFirebase;
