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

    $scope.startDate = new Date(2013, 0, 1);  // January 1
    $scope.endDate = new Date(); // Today

    $scope.simulate = function() {
      console.log('Simulate symbols: ' + $scope.symbols);

      var ref = fbutil.ref('simulations').push({
        symbols: $scope.symbols,
        startDate: $scope.startDate.getTime(),
        endDate: $scope.endDate.getTime(),
        started: Firebase.ServerValue.TIMESTAMP,
        op: 'Starting...'
      });
      $scope.running = $firebase(ref).$asObject();
    }
  });
