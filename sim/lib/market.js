'use strict';

function MarketHandler(sim) {
  this.sim = sim;
  this.daily = sim.root().child('history/daily');
  this.events = sim.child('events/pending');
}

/**
 * Replays history from history into this simulation's bars.
 */
MarketHandler.prototype.start = function() {
  return this.copyDates();
};

/**
 * Finds all available dates for bars in /history.
 * @returns {Promise} a Promise for the array of date keys.
 */
MarketHandler.prototype.copyDates = function() {
  var dates = this.daily.orderByKey()
    .startAt(this.sim.startDateKey())
    .endAt(this.sim.endDateKey())
    .once('value');

  var outer = this;
  return dates.then(function(snapshot) {
    var dates = [];
    snapshot.forEach(function (dateSnapshot) {
      outer.copyDate(dateSnapshot);
      dates.push(dateSnapshot.key());
    });
    return dates;
  });
};

MarketHandler.prototype.copyDate = function(dateSnapshot) {
  var targetRef = this.events.child(dateSnapshot.key());

  var value = dateSnapshot.val();
  var copy = {};
  this.sim.symbols.forEach(function(symbol) {
    copy[symbol] = value[symbol];
  });
  copy.type = 'bar';
  return targetRef.set(copy);
};

module.exports = MarketHandler;
