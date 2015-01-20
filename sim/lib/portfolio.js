/**
 * A portfolio of cash and positions in securities.
 */

'use strict';

var _ = require('lodash');
var when = require('when');


// TODO(mcg): separate position sizing decisions into a risk engine
// TODO(mcg): implement a separate broker
// TODO(mcg): implement commissions
// TODO(mcg): implement proper order events
// TODO(mcg): implement proper fill events
// TODO(mcg): implement slippage models
// TODO(mcg): implement rebalancing

function Portfolio(sim, initialCash) {
  this.sim = sim;
  this.bars = sim.newEventClient('bar');
  this.signals = sim.newEventClient('signal');
  this.cash = initialCash;
  this.buffer = 200;

  this.lastBar = null;
  this.positions = {};
  this.positionsLength = 0;

  this.values = sim.child('values');
}

Portfolio.prototype.start = function() {
  this.bars.watch(this.handleBar.bind(this));
  this.signals.watch(this.handleSignal.bind(this));
  return when.resolve(null);
};

Portfolio.prototype.handleBar = function(bar) {
  // Save this for later
  this.lastBar = bar;

  this.reportValue();
};

Portfolio.prototype.reportValue = function() {
  var securitiesValue = 0;

  var outer = this;
  _.forIn(this.positions, function(position, symbol) {
    securitiesValue += position.shares * outer.price(symbol);
  });

  var key = this.sim.toDateKey(this.lastBar.timestamp);
  this.values.child(key).set({
    type: 'total',
    timestamp: this.lastBar.timestamp,
    value: this.cash + securitiesValue
  });
};

Portfolio.prototype.handleSignal = function(signal) {
  var outer = this;
  this.sim.forEachSymbol(signal, function(symbol, level) {
    if (level && !outer.hasPosition(symbol)) {
      outer.buy(symbol);
    } else if (!level && outer.hasPosition(symbol)) {
      outer.sell(symbol);
    }
  });
};

Portfolio.prototype.price = function(symbol) {
  return this.lastBar[symbol].close;
};

Portfolio.prototype.hasPosition = function(symbol) {
  for (var key in this.positions) {
    if (this.positions.hasOwnProperty(key) && key === symbol) {
      return true;
    }
  }
  return false
}

Portfolio.prototype.buy = function(symbol) {
  // Assume each position is an equal-sized portion of the portfolio
  var openPositions = this.sim.symbols.length - this.positionsLength;
  var availableSpend = (this.cash - this.buffer) / openPositions;

  var price = this.price(symbol);
  var shares = Math.floor(availableSpend / price);
  var cost = shares * price;

  console.log('Buy ' + shares + ' of ' + symbol + ' @ ' + price);

  var position = {
    symbol: symbol,
    shares: shares,
    price: price,
    cost: cost
  };
  this.cash -= cost;
  this.positions[symbol] = position;
  this.positionsLength += 1;
};

Portfolio.prototype.sell = function(symbol) {
  var position = this.positions[symbol];
  var price = this.price(symbol);
  var proceeds = position.shares * price;

  console.log('Sell ' + position.shares + ' of ' + symbol + ' @ ' + price);

  this.cash += proceeds;
  delete this.positions[symbol];
  this.positionsLength -= 1;
};

module.exports = Portfolio;
