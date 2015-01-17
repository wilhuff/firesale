'use strict';

var util = require('./util');
var yahooFinance = require('yahoo-finance');

function Simulation(sim, ref) {
  this.sim = sim;
  this.ref = ref;
  this.symbols = util.splitCommas(sim.symbols)
  new Date(Date.parse(sim.startDate))

  this.daily = this.ref.root().child('history/daily');
}

/**
 * Starts the simulation.
 */
Simulation.prototype.start = function() {
  this.symbols.forEach(this.loadHistory.bind(this));
  this.progress('Started');
}

/**
 * Loads history for one symbol.
 *
 * @param symbol a ticker symbol, e.g. "SPY"
 */
Simulation.prototype.loadHistory = function(symbol) {
  this.progress('Loading ' + symbol + '...');

  var outer = this;
  this.daily.once('value', function (snapshot) {
    var haveStartDate = null;
    var haveEndDate = null;

    // Find the first occurrence of the symbol within a date node.
    snapshot.forEach(function (dateNode) {
      if (dateNode.hasChild(symbol)) {
        var key = dateNode.key();
        if (haveStartDate === null) {
          haveStartDate = key;
        }
        haveEndDate = key;
      }

      return false; // continue iteration
    });

    if (haveStartDate === null) {
      // No data exists yet, just load the whole thing.
      outer.loadYahooHistory(symbol, outer.sim.start, outer.sim.end);
    } else {
      // data surrounding
      if (outer.sim.start < haveStartDate) {
        outer.loadYahooHistory(symbol, outer.sim.start, haveStartDate);
      }
      if (haveEndDate < outer.sim.end) {
        outer.loadYahooHistory(symbol, haveEndDate, outer.sim.end);
      }
    }
  });
}

Simulation.prototype.loadYahooHistory = function(symbol, startDate, endDate) {
  this.progress('Loading ' + symbol + ' from=' + startDate + ', to=' + endDate);
  yahooFinance.historical({
    symbol: symbol,
    from: startDate,
    to: endDate
  }, this.processQuotes.bind(this));
}

Simulation.prototype.processQuotes = function(err, quotes) {
  if (err) {
    throw err;
  }
  var outer = this;
  quotes.forEach(function (bar) {
    var date = dayStamp(new Date(Date.parse(bar.date)));
    outer.daily.child(date).child(bar.symbol).set(bar);
  });
}

Simulation.prototype.progress = function(message) {
  this.sim.op = message;
  this.ref.update({'op': message});
  console.log('Simulation: ' + message);
}

function pad(num, width) {
  var val = num.toString();
  while (val.length < width) {
    val = '0' + val;
  }
  return val;
}

function dayStamp(date) {
  var year = pad(date.getFullYear(), 4);
  var month = pad(date.getMonth() + 1, 2);
  var day = pad(date.getDate(), 2);
  return year + '-' + month + '-' + day;
}

module.exports = Simulation;
