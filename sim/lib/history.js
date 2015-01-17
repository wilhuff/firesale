'use strict';

var async = require('async');
var util = require('./util');
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
  async.each(this.sim.symbols, this.loadOne.bind(this), function(err) {
    outer.sim.progress('Historical data loaded');
  })
};

/**
 * Loads history for one symbol.
 *
 * @param symbol a ticker symbol, e.g. "SPY"
 * @param loadCallback a callback to call once successful
 */
History.prototype.loadOne = function(symbol, loadCallback) {
  var outer = this;
  this.daily.once('value', function(snapshot) {
    var ranges = outer.findDateBounds(symbol, snapshot);
    async.each(ranges, function(range, rangeCallback) {
      outer.loadYahooHistory(symbol, range[0], range[1], rangeCallback);
    }, loadCallback);
  });
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
      var date = bar.date;
      if (date) {
        if (foundStart === null) {
          foundStart = date;
        }
        foundEnd = date;
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

/**
 * Loads and processes data for the given symbol in the range of the given timestamps.
 */
History.prototype.loadYahooHistory = function(symbol, startTime, endTime, loadCallback) {
  var outer = this;
  var startDate = this.sim.toDateKey(new Date(startTime));
  var endDate = this.sim.toDateKey(new Date(endTime));
  this.sim.progress('Loading ' + symbol + ' from=' + startDate + ', to=' + endDate);

  yahooFinance.historical({
    symbol: symbol,
    from: startDate,
    to: endDate
  }, function(err, quotes) {
    if (err) {
      loadCallback(err);
      return;
    }
    async.each(quotes, function(bar, cb) {
      var date = new Date(bar.date);
      var key = outer.sim.toDateKey(date);
      bar.date = date.getTime();
      outer.daily.child(key).child(bar.symbol).set(bar, cb);
    }, loadCallback);
  });
};

function pad(width, val) {
  val = val.toString();
  while (val.length < width) {
    val = '0' + val;
  }
  return val;
}

module.exports = History;
