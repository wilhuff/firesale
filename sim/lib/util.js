'use strict';

module.exports = {
  splitCommas: function(str) {
    return str.trim().split(/\s*,\s*/);
  },

  /**
   * Sets up the prototype chain for inheritance, with sub extending base.
   *
   * @param base The base class
   * @param sub The subclass
   */
  extend: function(base, sub) {
    sub.prototype = Object.create(base.prototype);
    sub.prototype.constructor = sub;
  }
};
