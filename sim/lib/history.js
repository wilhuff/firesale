'use strict';

var when = require('when');
var nodefn = require('when/node');


var yahooFinance = require('yahoo-finance');

function History(sim) {
  this.sim = sim;

  this.daily = sim.root().child('history/daily');
}

/**
 * Loads all history defined for the simulation.
 */
History.prototype.load = function() {
  var outer = this;
  return when.map(this.sim.symbols, this.loadOne.bind(this))
    .then(function() {
      return outer.sim.progress('Historical data loaded');
    });
};

/**
 * Loads history for one symbol.
 *
 * @param symbol a ticker symbol, e.g. "SPY"
 */
History.prototype.loadOne = function(symbol) {
  var outer = this;
  return this.daily.once('value')
    .then(function(snapshot) {
      var ranges = outer.findDateBounds(symbol, snapshot);
      return when.all(ranges.map(function(range) {
        return outer.loadYahooHistory(symbol, range[0], range[1]);
      }));
    });
};

/**
 * Loads and processes data for the given symbol in the range of the given timestamps.
 */
History.prototype.loadYahooHistory = function(symbol, startTime, endTime) {
  var options = {
    symbol: symbol,
    from: this.sim.toDateKey(new Date(startTime)),
    to: this.sim.toDateKey(new Date(endTime))
  };
  this.sim.progress('Loading ' + symbol + ' from=' + options.from + ', to=' + options.to);

  return nodefn.call(yahooFinance.historical, options)
    .then(this.processAll.bind(this));
};

/**
 * Processes all the given bars and returns a Promise that they'll be stored in the /history tree.
 * @returns a promise
 */
History.prototype.processAll = function(bars) {
  var outer = this;
  return when.all(bars.map(function(bar) {
    return outer.processOne(bar);
  }));
};

History.prototype.processOne = function(bar) {
  var date = new Date(bar.date);
  var timestamp = date.getTime();
  var key = this.sim.toDateKey(date);

  delete bar['date'];
  bar['timestamp'] = timestamp;

  var update = {
    type: 'bar',
    timestamp: timestamp
  };
  update[bar.symbol] = bar;

  return this.daily.child(key)
    .update(update);
};

/**
 * Searches through a snapshot to find the bounds of data to load, given the intended simulation
 * duration.
 *
 * @param symbol the symbol to look for.
 * @param dailySnapshot a DataSnapshot of /history/daily.
 * @returns {Array} an array of ranges, where each range is a two-element array of start and
 *     end bounds to load.
 */
History.prototype.findDateBounds = function(symbol, dailySnapshot) {
  var foundStart = null;
  var foundEnd = null;

  // Find the first occurrence of the symbol within a date node.
  dailySnapshot.forEach(function(dateNode) {
    var val = dateNode.val();
    var bar = val[symbol];
    if (bar) {
      var timestamp = bar.timestamp;
      if (timestamp) {
        if (foundStart === null) {
          foundStart = timestamp;
        }
        foundEnd = timestamp;
      }
    }

    return false; // continue iteration
  });

  var ranges = [];
  if (foundStart === null) {
    // No data exists yet, just load the whole thing.
    ranges.push([this.sim.startTime, this.sim.endTime]);

  } else {
    if (this.sim.startTime < foundStart) {
      ranges.push([this.sim.startTime, foundStart]);
    }
    if (foundEnd < this.sim.endTime) {
      ranges.push([foundEnd, this.sim.endTime]);
    }
  }
  return ranges;
};

module.exports = History;
