'use strict';
/**
 * @ngdoc function
 * @name firesaleApp.controller:SimCtrl
 * @description
 * # SimCtrl
 * Simulates a portfolio
 */
angular.module('firesaleApp')
  .controller('SimCtrl', function ($scope, user, $firebase, fbutil) {

    $scope.symbols = '';

    var ref = fbutil.ref('simulations').child(user.uid);
    var sync = $firebase(ref).$asObject();
    sync.$loaded().then(function(sim) {
      if (!$scope.symbols) {
        $scope.symbols = sim.symbols;
      }
    });

    $scope.simulate = function() {
      console.log('Simulate symbols: ' + $scope.symbols);

      ref.set({
        'symbols': $scope.symbols,
        'start': new Date().getTime()
      })
    }
  });
