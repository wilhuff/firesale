'use strict';

var History = require('./history');
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

    return history.load()
      .catch(function(err) {
        sim.error(err, 'Simulation failed');
      })
      .done();
  }
};

module.exports = MainCtrl;

