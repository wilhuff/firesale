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

    $scope.startDate = new Date(Date.UTC(2013, 0, 2));
    $scope.endDate = new Date(); // Today

    $scope.simulate = function() {
      console.log('Simulate symbols: ' + $scope.symbols);

      var ref = fbutil.ref('simulations').push({
        symbols: $scope.symbols,
        startTime: toMidnightTimestamp($scope.startDate),
        endTime: toMidnightTimestamp($scope.endDate),
        requestTime: Firebase.ServerValue.TIMESTAMP,
        op: 'Starting...'
      });
      $scope.running = $firebase(ref).$asObject();
    }
  });

/**
 * Converts between a local date and midnight UTC of the same date.
 * @param date
 */
function toMidnightTimestamp(date) {
  // Truncate back to midnight local time
  date = new Date(date);
  date.setHours(0, 0, 0, 0);

  // Offset the UTC timestamp with the timezone offset to get the equivalent midnight UTC
  return date.getTime() - date.getTimezoneOffset() * 60000;
}
