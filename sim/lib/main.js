'use strict';

var History = require('./history');
var Simulation = require('./sim');

function MainCtrl(firebase) {
  this.firebase = firebase;
}

MainCtrl.prototype.cleanup = function(cb) {
  var sims = this.firebase.child('simulations');
  sims.remove(cb);
}

MainCtrl.prototype.watch = function() {
  // Avoid replaying old simulations on startup. Note that the child_added callback will be called
  // once with the last simulation
  var sims = this.firebase.child('simulations');
  sims.endAt().limitToLast(1).on('child_added', this.simulate.bind(this));
}

MainCtrl.prototype.simulate = function(snapshot) {
  var sim = new Simulation(snapshot);
  if (sim.incomplete()) {
    new History(sim).load()
      .catch(function(err) {
        sim.error(err, 'Simulation failed.');
      })
      .done();
  }
}

module.exports = MainCtrl;

