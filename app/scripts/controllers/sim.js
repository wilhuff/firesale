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
    $scope.running = null;

    $scope.simulate = function() {
      console.log('Simulate symbols: ' + $scope.symbols);

      var ref = fbutil.ref('simulations').push({
        symbols: $scope.symbols,
        started: Firebase.ServerValue.TIMESTAMP,
        op: 'Starting...'
      });
      $scope.running = $firebase(ref).$asObject();
    }
  });
