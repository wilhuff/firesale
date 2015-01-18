var MainCtrl = require('./lib/main');
var CommandProcessor = require('./lib/commands');
var PromisedFirebase = require('./lib/fbpromise');

var Firebase = require('firebase');

function main() {
  var root = new Firebase('https://burning-inferno-9409.firebaseio.com/');
  var promised = new PromisedFirebase(root);
  var main = new MainCtrl(promised);
  var commands = new CommandProcessor(main);

  commands.processArgv();
}

main();
