var MainCtrl = require('./lib/main');
var CommandProcessor = require('./lib/commands');

var Firebase = require('firebase');

function main() {
  var root = new Firebase('https://burning-inferno-9409.firebaseio.com/');
  var main = new MainCtrl(root);
  var commands = new CommandProcessor(main);

  commands.processArgv();
}

main();
