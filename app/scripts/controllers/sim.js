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

    $scope.symbols = 'VTI, VEU, IEF, VNQ, DBC';
    $scope.running = null;
    $scope.strategy = 'Ivy';

    $scope.startDate = new Date(Date.UTC(2015, 0, 2));
    $scope.endDate = new Date(); // Today

    $scope.simulate = function() {
      var ref = submit();
      graph(ref);
    }

    function submit() {
      console.log('Simulate symbols: ' + $scope.symbols);

      var ref = fbutil.ref('simulations').push({
        symbols: $scope.symbols,
        strategy: $scope.strategy,
        startTime: toMidnightTimestamp($scope.startDate),
        endTime: toMidnightTimestamp($scope.endDate),
        requestTime: Firebase.ServerValue.TIMESTAMP,
        op: 'Starting...'
      });
      $scope.running = $firebase(ref).$asObject();
      return ref;
    }

    function graph(ref) {
      var start = toMidnightTimestamp($scope.startDate);
      var end = toMidnightTimestamp($scope.endDate);
      var days = Math.floor((end - start) / 24 * 60 * 60 * 1000);

      new FireGrapher(ref.child('values'), '#graph-value', {
        type: 'line',
        path: '*',
        title: 'Portfolio Value',
        xCoord: {
          label: 'time',
          value: 'timestamp',
          // stream: true,
          // limit: days,
          min: toMidnightTimestamp($scope.startDate),
          max: toMidnightTimestamp($scope.endDate)
        },
        yCoord: {
          label: 'value',
          value: 'value',
          min: 0,
          max: 200000
        },
        series: 'type'
      })
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
