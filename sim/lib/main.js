'use strict';

var EventBus = require('./event').EventBus;
var History = require('./history');
var Portfolio = require('./portfolio');
var Simulation = require('./sim');
var strategies = require('./strategy');

function MainCtrl(firebase) {
  this.firebase = firebase;
}

MainCtrl.prototype.cleanSimulations = function() {
  var sims = this.firebase.child('simulations');
  return sims.remove();
};

MainCtrl.prototype.cleanHistory = function() {
  var sims = this.firebase.child('history');
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
    var events = new EventBus(sim);
    var portfolio = new Portfolio(sim, 100000);
    var strategy = new strategies.Ivy(sim);

    return history.load()
      .then(portfolio.start.bind(portfolio))
      .then(strategy.start.bind(strategy))
      .then(events.seed.bind(events, history.daily))
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

