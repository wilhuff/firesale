'use strict';

var util = require('./util');

function Simulation(snapshot) {
  this.val = snapshot.val();
  this._ref = snapshot.ref();

  this.symbols = util.splitCommas(this.val.symbols);
  this.startTime = this.val.startTime;
  this.endTime = this.val.endTime;
}

Simulation.prototype.ref = function() {
  return this._ref;
}

Simulation.prototype.child = function(key) {
  return this.ref().child(key);
}

Simulation.prototype.root = function() {
  return this.ref().root();
}

Simulation.prototype.incomplete = function() {
  return this.val.op === 'Starting...';
}

Simulation.prototype.startDateKey = function() {
  return this.toDateKey(new Date(this.val.startTime));
}

Simulation.prototype.endDateKey = function() {
  return this.toDateKey(new Date(this.val.endTime));
}

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
}

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
