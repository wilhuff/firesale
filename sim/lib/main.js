'use strict';

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
  sims.endAt().limitToLast(1).on('child_added', function(snapshot) {
    var val = snapshot.val();
    if (val.op === 'Starting...') {
      var sim = new Simulation(val, snapshot.ref());
      sim.start();
    }
  });
}

module.exports = MainCtrl;

