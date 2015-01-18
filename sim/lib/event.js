'use strict';

var when = require('when');

function EventBus(sim) {
  this.sim = sim;
  this.events = sim.child('events');
  this.pending = this.events.child('pending');
  this.queue = this.pending
    .orderByPriority()
    .limitToFirst(1);

  // Key track of the last event delivered because events are delivered twice for reasons I can't
  // fathom (yet).
  this.lastEventKey = null;
}

EventBus.prototype.loop = function() {
  var outer = this;

  this.sim.progress('Starting event loop');

  var next = function() {
    return outer.queue.once('value');
  };

  return when.iterate(next, function(event) {
    return !event.exists();
  }, outer.nextEvent.bind(outer), next());
};

/**
 * Receives the next pending event and delivers it
 */
EventBus.prototype.nextEvent = function(eventView) {
  var subTree = eventView.val();
  var eventKey = firstKey(subTree);
  if (!eventKey || eventKey === this.lastEventKey) {
    return;
  }
  this.lastEventKey = eventKey;

  var value = subTree[eventKey];
  var type = value.type;

  var delivered = this.events.child(type).child(eventKey);

  // Deliver the event, wait for all listeners to fire and then delete the source event.
  return delivered.set(value)
    .then(function() {
      console.log('Event: ' + eventKey + ' processed.');
      return eventView.ref().child(eventKey).remove();
    });
}

function firstKey(events) {
  for (var key in events) {
    if (events.hasOwnProperty(key)) {
      return key;
    }
  }
}

module.exports = EventBus;
