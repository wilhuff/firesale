'use strict';

var EventClient = require('./event').EventClient;
var util = require('./util');
var _ = require('lodash');


function Simulation(snapshot) {
  this.val = snapshot.val();
  this._ref = snapshot.ref();

  this.symbols = util.splitCommas(this.val.symbols);
  this.startTime = this.val.startTime;
  this.endTime = this.val.endTime;

  // Tie-breaker for events that happen at the same time, incremented for each new event.
  this.counter = 1;
}

Simulation.prototype.validateEvent = function(event) {
  if (!event.type) {
    throw Error('Event missing type: ' + JSON.stringify(event));
  }
  if (!event.timestamp) {
    throw Error('Event missing timestamp: ' + JSON.stringify(event));
  }
  if (!event.counter) {
    event.counter = this.counter++;
  }

  return event;
};

Simulation.prototype.eventKey = function(event) {
  return [
    this.toDateKey(event.timestamp),
    event.counter,
    event.type
  ].join('-');
};

Simulation.prototype.newEventClient = function(kind) {
  return new EventClient(this, kind);
};

Simulation.prototype.newSignal = function(barEvent, levels) {
  var signal = {
    type: 'signal',
    timestamp: barEvent.timestamp,
    counter: this.counter++
  };

  _.assign(signal, levels);
  return signal;
};

Simulation.prototype.forEachSymbol = function(event, callback) {
  this.symbols.forEach(function(symbol) {
    var value = event[symbol];
    if (typeof value !== 'undefined') {
      callback(symbol, value);
    }
  })
};

Simulation.prototype.ref = function() {
  return this._ref;
};

Simulation.prototype.child = function(key) {
  return this.ref().child(key);
};

Simulation.prototype.root = function() {
  return this.ref().root();
};

Simulation.prototype.incomplete = function() {
  return this.val.op === 'Starting...';
};

Simulation.prototype.startDateKey = function() {
  return this.toDateKey(this.getStartDate());
};

Simulation.prototype.endDateKey = function() {
  return this.toDateKey(this.getEndDate());
};

/**
 * Creates a timestamp string from a Date.
 *
 * @param {Date} date
 * @returns {string}
 */
Simulation.prototype.toDateKey = function(date) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  var year = pad(4, date.getUTCFullYear());
  var month = pad(2, date.getUTCMonth() + 1);
  var day = pad(2, date.getUTCDate());
  return year + '-' + month + '-' + day;
};

Simulation.prototype.error = function(err, message) {
  message = 'ERROR: ' + message + ': ' + err;
  this.val.op = message;
  this.ref().update({'op': message});
  console.log('Progress: ' + message + '\n' + err.stack);
  return err;
};

Simulation.prototype.progress = function(message) {
  this.val.op = message;
  this.ref().update({'op': message});
  console.log('Progress: ' + message);
};

function pad(width, val) {
  val = val.toString();
  while (val.length < width) {
    val = '0' + val;
  }
  return val;
}

module.exports = Simulation;
