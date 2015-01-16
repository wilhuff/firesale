'use strict';

var util = require('./util');

function Simulation(sim, ref) {
  this.sim = sim;
  this.ref = ref;
  this.symbols = util.splitCommas(sim.symbols)
}

Simulation.prototype.start = function() {
  this.symbols.forEach(this.loadHistory.bind(this));
  this.progress('Started');
}

Simulation.prototype.loadHistory = function(symbol) {
  this.progress('Loading ' + symbol + '...');
}

Simulation.prototype.progress = function(message) {
  this.sim.op = message;
  this.ref.update({'op': message});
  console.log('Simulation: ' + message);
}

module.exports = Simulation;
