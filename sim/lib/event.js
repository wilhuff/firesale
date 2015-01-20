'use strict';

var PriorityQueue = require('js-priority-queue');
var _ = require('lodash');


function EventBus(sim) {
  this.sim = sim;
  this.events = sim.child('events');
  this.inboxClient = this.newEventClient('inbox');
  this.inbox = this.events.child('inbox');

  this.queue = new PriorityQueue({comparator: orderEvents});

  // Subscribers for in-memory only events.
  this.nondurable = ['bar'];
  this.subscribers = {};
}

EventBus.prototype.isNonDurable = function(kind) {
  return _.contains(this.nondurable, kind);
}

EventBus.prototype.newEventClient = function(kind) {
  if (this.isNonDurable(kind)) {
    return new MemoryEventClient(this, kind);
  } else {
    return new PersistentEventClient(this, kind);
  }
};

/**
 * Imposes a total ordering on events: first by timestamp and then by counter. The counter value
 * increases for each event as it's created, serving to act as a tie-breaker among events created
 * for the same timestamp.
 *
 * @returns {number} -1, 0, or 1 if the left-hand event is less than, equal to, or greater than
 *     the right-hand event.
 */
function orderEvents(left, right) {
  if (left.timestamp < right.timestamp) {
    return -1;
  } else if (left.timestamp > right.timestamp) {
    return 1;
  }

  if (left.counter < right.counter) {
    return -1;
  } else if (left.counter > right.counter) {
    return 1;
  }

  return 0;
}

/**
 * Seeds the EventBus with events from the given Firebase reference. Useful for stocking the
 * queue with market events during backtesting.
 */
EventBus.prototype.seed = function(ref) {
  console.log('Seeding from ' + ref.path());

  var outer = this;
  return ref.orderByKey()
    .startAt(this.sim.startDateKey())
    .endAt(this.sim.endDateKey() + '~')
    .once('value')
    .then(function(value) {
      value.forEach(function(snapshot) {
        outer.enqueueEvent(snapshot.val());
      });
    });
};

/**
 * Enqueues an event in the internal priority queue.
 *
 * @param event An event object
 */
EventBus.prototype.enqueueEvent = function(event) {
  this.queue.queue(this.sim.validateEvent(event));
};

/**
 * Runs the main event loop until no further events are available.
 * @returns a Promise for the final event invocation.
 */
EventBus.prototype.loop = function() {
  console.log('Starting event loop');

  this.inboxClient.watch(this.enqueueEvent.bind(this));
  return this.next();
};

EventBus.prototype.next = function() {
  if (!this.queue.length) {
    this.inboxClient.unwatch();
    return;
  }

  var head = this.queue.dequeue();
  var type = head.type;

  if (this.isNonDurable(type)) {
    var subs = this.subscribers[type];
    if (subs != null) {
      subs.forEach(function(sub) {
        sub(head);
      });
    }
    console.log('Event: ' + this.sim.eventKey(head) + ' processed.');
    return this.next();

  } else {
    // Deliver the event, wait for all listeners to fire and then delete the source event.
    var outer = this;
    return this.events.child(type).push(head)
      .then(function() {
        console.log('Event: ' + outer.sim.eventKey(head) + ' processed.');
        return outer.next();
      });
  }

};

EventBus.prototype.publish = function(event) {
  event = this.sim.validateEvent(event);

  if (this.isNonDurable(event.type)) {
    this.enqueueEvent(event);
  } else {
    this.inbox.push(event);
  }
};

/**
 * Creates an EventClient that abstracts away event delivery details.
 * @constructor
 */
function PersistentEventClient(bus, kind) {
  this.bus = bus;
  this.events = bus.events.child(kind);
  this.callback = null;
}

/**
 * Starts a listener for events arriving via the inbox at $sim/events/inbox.
 *
 * @param callback a callback which takes an event object (not a DataSnapshot).
 */
PersistentEventClient.prototype.watch = function(callback) {
  this.callback = function(snapshot) {
    var val = snapshot.val();
    callback(val);
  };
  this.events.on('child_added', this.callback);
};

PersistentEventClient.prototype.unwatch = function() {
  // TODO(mcg): unregister by reference to the callback
  // This doesn't work yet because the callback actually used by PromisedFirebase is ephemeral
  // and not tracked anywhere. For now just punt and kick everyone off when anyone unwatches.
  this.events.off('child_added');
  this.callback = null;
};

PersistentEventClient.prototype.publish = function(event) {
  this.bus.publish(event);
};


/**
 * Creates an EventClient that abstracts away event delivery details.
 * @constructor
 */
function MemoryEventClient(bus, kind) {
  this.bus = bus;
  this.kind = kind;
  this.callback = null;
}

/**
 * Starts a listener for events arriving via the inbox at $sim/events/inbox.
 *
 * @param callback a callback which takes an event object (not a DataSnapshot).
 */
MemoryEventClient.prototype.watch = function(callback) {
  this.callback = callback;
  var subs = this.bus.subscribers[this.kind];
  if (subs == null) {
    subs = [];
    this.bus.subscribers[this.kind] = subs;
  }
  subs.push(callback);
};

MemoryEventClient.prototype.unwatch = function() {
  // TODO(mcg): unregister by reference to the callback
  // This doesn't work yet because the callback actually used by PromisedFirebase is ephemeral
  // and not tracked anywhere. For now just punt and kick everyone off when anyone unwatches.
  var subs = this.bus.subscribers[this.kind];
  var pos = subs.indexOf(callback);
  subs.splice(pos, 1);
  this.callback = null;
};

MemoryEventClient.prototype.publish = function(event) {
  this.bus.publish(event);
};

module.exports = EventBus;
