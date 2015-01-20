/**
 * Trading strategies.
 */

'use strict';

var _ = require('lodash');
var util = require('./util');
var when = require('when');


function Strategy(sim, events) {
  this.sim = sim;
  this.events = events.newEventClient('bar');

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
function BuyAndHold(sim, events) {
  Strategy.call(this, sim, events);
}
util.extend(Strategy, BuyAndHold);

BuyAndHold.prototype.handleBar = function(bars) {
  var levels = {};
  this.sim.forEachSymbol(bars, function(symbol) {
    levels[symbol] = 1;
  });
  this.publish(bars, levels);
};

/**
 * The strategy behind Ivy Portfolio, that:
 *
 * <ul>
 *   <li>trades monthly,
 *   <li>implements market timing based on the simple moving average, and
 *   <li>ranks components with the highest momentum.
 *   <li>only keeps the top
 */
function Ivy(sim, events) {
  Strategy.call(this, sim, events);
  this.monthly = new MonthlyFilter(1, sim.getStartDate());
  this.sma = new SimpleMovingAverage(10);
  this.momentum = new SimpleMomentum(3);
  this.top = new TopValueRestriction(3);
}
util.extend(Strategy, Ivy);

Ivy.prototype.handleBar = function(bars) {
  if (!this.monthly.matches(bars)) {
    // Throw away all signals before the target day of the month.
    return;
  }

  var outer = this;
  var levels = outer.top.next();
  this.sim.forEachSymbol(bars, function(symbol, bar) {
    var sma = outer.sma.update(symbol, bar);
    var momentum = outer.momentum.update(symbol, bar);
    if (sma) {
      var diff = (bar.close - sma) / sma;
      if (bar.close == sma) {
        // (i.e. diff == 0, but without the possibility of floating point error.)
        //
        // If the current price is exactly the SMA, then generate no signal at all for that symbol
        // Which will have the effect of continuing the prior month's level, whatever it was.

      } else if (diff < 0) {
        // Disallow short sales
        levels[symbol] = 0;

      } else  {
        // Let ranking by moment determine levels.
        outer.top.add(symbol, momentum, diff);
      }
    }
  });
  this.publish(bars, levels);
};

/**
 * Filters incoming bars so that only one day per month matches.
 * @param dayOfMonth the target day of the month, the first bar after this day monthly will be
 *     returned.
 * @param startDate the starting date of the series.
 * @constructor
 */
function MonthlyFilter(dayOfMonth, startDate) {
  this.nextDate = new Date(startDate);
  if (this.nextDate.getDate() != dayOfMonth) {
    this.nextDate.setDate(dayOfMonth);
    this.advanceMonth();
  }
}

MonthlyFilter.prototype.matches = function(bars) {
  var date = new Date(bars.timestamp);
  if (date < this.nextDate) {
    return false;
  }

  this.advanceMonth();
  return true;
};

MonthlyFilter.prototype.advanceMonth = function() {
  this.nextDate.setMonth(this.nextDate.getMonth() + 1);
};


function SimpleMovingAverage(length) {
  this.history = new History(length);
}

SimpleMovingAverage.prototype.update = function(symbol, bar) {
  var series = this.history.update(symbol, bar);
  if (series == null) {
    return;
  }

  var sum = _.reduce(series, function (a, b) { return a + b; }, 0);
  return sum / series.length;
};


function SimpleMomentum(length) {
  this.history = new History(length);
}

SimpleMomentum.prototype.update = function(symbol, bar) {
  var series = this.history.update(symbol, bar);
  if (series == null) {
    return;
  }

  var oldest = series[0];
  if (oldest == 0) {
    return 0;
  }
  var newest = series[series.length - 1];
  return (newest - oldest) / oldest;
};


function History(length) {
  this.prices = {};
  this.length = length;
}

History.prototype.update = function(symbol, bar) {
  var series = this.prices[symbol];
  if (typeof series === 'undefined') {
    series = [];
    this.prices[symbol] = series;
  }

  // If we don't yet have enough data for this symbol, the result is undefined.
  series.push(bar.close);
  if (series.length < this.length) {
    return null;
  }

  // Otherwise, discard the oldest value
  if (series.length > this.length) {
    series.shift();
  }

  return series;
};


function TopValueRestriction(onlyTop) {
  this.onlyTop = onlyTop;
  this.ranks = null;
  this.levels = null;
}

TopValueRestriction.prototype.next = function() {
  this.ranks = {};
  this.levels = {};
  return this.levels;
};

TopValueRestriction.prototype.add = function(symbol, rank, level) {
  // If we have fewer than the required positions the incoming position is fine.
  var length = _.size(this.ranks);
  if (length < this.onlyTop) {
    this.ranks[symbol] = rank;
    this.levels[symbol] = level;
    return;
  }

  // May need to drop a level if its rank is lower than the incoming one
  var lowestRank = null;
  var lowestSymbol = null;
  _.forIn(this.ranks, function(rank, symbol) {
    if (lowestRank == null || (rank < lowestRank)) {
      lowestRank = rank;
      lowestSymbol = symbol;
    }
  });
  if (lowestRank < rank) {
    // Replace the current worst with the incoming values
    delete this.ranks[lowestSymbol];
    this.levels[lowestSymbol] = 0;

    this.ranks[symbol] = rank;
    this.levels[symbol] = level;

  } else {
    // The incoming position is not among the top positions: sell.
    this.levels[symbol] = 0;
  }
};

module.exports = {
  BuyAndHold: BuyAndHold,
  Ivy: Ivy
};
