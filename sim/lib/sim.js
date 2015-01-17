'use strict';

var util = require('./util');
var yahooFinance = require('yahoo-finance');

function Simulation(sim, ref) {
  this.sim = sim;
  this.ref = ref;
  this.symbols = util.splitCommas(sim.symbols);

  this.daily = this.ref.root().child('history/daily');
}

/**
 * Starts the simulation.
 */
Simulation.prototype.start = function() {
  this.symbols.forEach(this.loadHistory.bind(this));
  this.progress('Started');
};

/**
 * Loads history for one symbol.
 *
 * @param symbol a ticker symbol, e.g. "SPY"
 */
Simulation.prototype.loadHistory = function(symbol) {
  var outer = this;
  this.daily.once('value', function(snapshot) {
    var ranges = outer.findDateBounds(symbol, snapshot);
    ranges.forEach(function(range) {
      outer.loadYahooHistory(symbol, range[0], range[1]);
    });
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
Simulation.prototype.findDateBounds = function(symbol, dailySnapshot) {
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
Simulation.prototype.loadYahooHistory = function(symbol, startTime, endTime) {
  var outer = this;
  var startDate = new Date(parseInt(startTime));
  var endDate = new Date(parseInt(endTime));
  this.progress('Loading ' + symbol
      + ' from=' + toDateKey(startDate)
      + ', to=' + toDateKey(endDate));
  yahooFinance.historical({
    symbol: symbol,
    from: toDateKey(startDate),
    to: toDateKey(endDate)
  }, function(err, quotes) {
    if (err) {
      throw err;
    }
    quotes.forEach(function(bar) {
      var date = new Date(bar.date);
      var key = toDateKey(date);
      bar.date = date.getTime();
      outer.daily.child(key).child(bar.symbol).set(bar);
    });
  });
};

Simulation.prototype.progress = function(message) {
  this.sim.op = message;
  this.ref.update({'op': message});
  console.log('Simulation: ' + message);
};

/**
 * Creates a timestamp string from a Date.
 *
 * @param {Date} date
 * @returns {string}
 */
function toDateKey(date) {
  var year = pad(4, date.getUTCFullYear());
  var month = pad(2, date.getUTCMonth() + 1);
  var day = pad(2, date.getUTCDate());
  return year + '-' + month + '-' + day;
}

function pad(width, val) {
  val = val.toString();
  while (val.length < width) {
    val = '0' + val;
  }
  return val;
}

module.exports = Simulation;
