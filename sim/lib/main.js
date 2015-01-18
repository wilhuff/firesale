'use strict';

var EventBus = require('./event');
var History = require('./history');
var MarketHandler = require('./market');
var Simulation = require('./sim');

function MainCtrl(firebase) {
  this.firebase = firebase;
}

MainCtrl.prototype.cleanup = function() {
  var sims = this.firebase.child('simulations');
  return sims.remove();
};

MainCtrl.prototype.watch = function() {
  // Avoid replaying old simulations on startup. Note that the child_added callback will be called
  // once with the last simulation

  var sims = this.firebase.child('simulations');
  var limited = sims.endAt().limitToLast(1);
  limited.on('child_added', this.simulate, this);
};

MainCtrl.prototype.simulate = function(snapshot) {
  var sim = new Simulation(snapshot);
  if (sim.incomplete()) {
    var history = new History(sim);
    var market = new MarketHandler(sim);
    var events = new EventBus(sim);

    return history.load()
      .then(market.start.bind(market))
      .then(events.loop.bind(events))
      .catch(function(err) {
        sim.error(err, 'Simulation failed');
      })
      .done(function() {
        sim.progress('Complete!');
      });
  }
};

module.exports = MainCtrl;

