/**
 * Trading strategies.
 */

'use strict';

var _ = require('lodash');
var util = require('./util');
var when = require('when');


function Strategy(sim) {
  this.sim = sim;
  this.events = sim.newEventClient('bar');

  this.levels = {};
}

Strategy.prototype.start = function() {
  this.events.watch(this.handleBar.bind(this));

  // start should return a promise, but in this case there's no deferred work.
  return when.resolve(null);
};

Strategy.prototype.stop = function() {
  this.events.unwatch();
};

/**
 * Publish a new event based on the given levels but only if the levels differ from the previous
 * levels.
 *
 * @param barEvent The bar event that triggered the strategy's action.
 * @param levels The levels to publish.
 */
Strategy.prototype.publish = function(barEvent, levels) {
  if (!_.isEqual(levels, this.levels)) {
    this.levels = levels;
    var signal = this.sim.newSignal(barEvent, levels);
    this.events.publish(signal);
  }
};

/**
 * Constructor for a buy and hold strategy that buys the securities the simulation asks for as
 * soon as they're available.
 *
 * @constructor
 */
function BuyAndHold(sim) {
  Strategy.call(this, sim);
}
util.extend(Strategy, BuyAndHold);

BuyAndHold.prototype.handleBar = function(bars) {
  var levels = {};
  this.sim.forEachSymbol(bars, function(symbol) {
    levels[symbol] = 1;
  });
  this.publish(bars, levels);
};

module.exports = {
  BuyAndHold: BuyAndHold
};
