'use strict';

var PriorityQueue = require('js-priority-queue');

function EventBus(sim) {
  this.sim = sim;
  this.events = sim.child('events');
  this.inbox = sim.newEventClient('inbox');

  this.queue = new PriorityQueue({comparator: orderEvents});

  // Tie-breaker for events that happen at the same time, incremented for each new event.
  this.counter = 1;
}

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
      value.forEach(outer.enqueueEvent.bind(outer));
    });
};

/**
 * Enqueues an event in the internal priority queue.
 *
 * @param snapshot a DataSnapshot representing the contents of the event.
 */
EventBus.prototype.enqueueEvent = function(snapshot) {
  var event = snapshot.val();
  event.counter = this.counter++;
  this.queue.queue(event);
};

/**
 * Handles a new event arriving in the event inbox. This calls enqueueEvent and then removes the
 * data in the inbox.
 *
 * @param snapshot a DataSnapshot representing the contents of the event. The data behind this
 *     snapshot will be deleted.
 */
EventBus.prototype.handleInbox = function(snapshot) {
  this.enqueueEvent(snapshot);
  snapshot.ref().remove()
    .done();
};

/**
 * Runs the main event loop until no further events are available.
 * @returns a Promise for the final event invocation.
 */
EventBus.prototype.loop = function() {
  console.log('Starting event loop');

  this.inbox.watch(this.handleInbox.bind(this));
  return this.next();
};

EventBus.prototype.next = function() {
  if (!this.queue.length) {
    this.inbox.unwatch();
    return;
  }

  var head = this.queue.dequeue();
  var type = head.type;
  var eventKey = this.sim.toDateKey(head.timestamp);

  var delivered = this.events.child(type).child(eventKey);

  // Deliver the event, wait for all listeners to fire and then delete the source event.
  var outer = this;
  return delivered.set(head)
    .then(function() {
      console.log('Event: ' + eventKey + ' processed.');
      return outer.next();
    });
};

/**
 * Creates an EventClient that abstracts away event delivery details.
 * @constructor
 */
function EventClient(sim, kind) {
  this.sim = sim;
  this.events = sim.child('events').child(kind);
  this.callback = null;
}

/**
 * Starts a listener for events arriving via the inbox at $sim/events/inbox.
 */
EventClient.prototype.watch = function(callback) {
  this.callback = callback;
  this.events.on('child_added', this.callback);
};

EventClient.prototype.unwatch = function() {
  // TODO(mcg): unregister by reference to the callback
  // This doesn't work yet because the callback actually used by PromisedFirebase is ephemeral
  // and not tracked anywhere. For now just punt and kick everyone off when anyone unwatches.
  this.events.off('child_added');
  this.callback = null;
};


module.exports = {
  EventBus: EventBus,
  EventClient: EventClient
};
