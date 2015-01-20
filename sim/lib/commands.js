'use strict';

/*
 * Implements a kind of mini command processor for driving the backend.
 */
function CommandProcessor(controller) {
  this.controller = controller;
}

CommandProcessor.prototype.processArgv = function() {
  var commands = process.argv.slice(2);
  if (!commands.length) {
    commands = ['watch'];
  }
  var outer = this;
  commands.forEach(function(command) {
    outer.process(command);
  });
}

function success() {
  console.log('SUCCESS!');
  process.exit();
}

function failure(error) {
  console.log('ERROR: ' + error);
  process.exit(1);
}

CommandProcessor.prototype.process = function(command) {
  switch (command) {
    case 'clean-sims':
      this.controller.cleanSimulations()
        .done(success, failure);
      break;

    case 'clean-history':
      this.controller.cleanHistory()
        .done(success, failure);
      break;

    case 'watch':
      this.controller.watch();
      break;

    default:
      throw 'Unknown command ' + command;
  }
}

module.exports = CommandProcessor;
