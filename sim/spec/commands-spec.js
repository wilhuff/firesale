'use strict';

var CommandProcessor = require('../lib/commands.js');

describe('CommandProcessor', function() {
  var controller;

  beforeEach(function() {
    controller = {
      cleanup: function() { },
      watch: function() { }
    };
  });

  it('should clean up sims', function() {
    spyOn(controller, 'cleanup');
    new CommandProcessor(controller).process('clean');
    expect(controller.cleanup).toHaveBeenCalled();
  });

  it('should watch', function() {
    spyOn(controller, 'watch');
    new CommandProcessor(controller).process('watch');
    expect(controller.watch).toHaveBeenCalled();
  });

  it('should throw on unrecognized', function() {
    expect(function() {
      new CommandProcessor(controller).process('unknown');
    }).toThrow();
  });
})
