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

CommandProcessor.prototype.process = function(command) {
  var outer = this;
  switch (command) {
    case 'clean':
      this.controller.cleanup(function(error) {
        if (error) {
          console.log('ERROR: ' + error);
        }
        process.exit();
      })
      break;

    case 'watch':
      this.controller.watch();
      break;

    default:
      throw 'Unknown command ' + command;
  }
}

module.exports = CommandProcessor;
