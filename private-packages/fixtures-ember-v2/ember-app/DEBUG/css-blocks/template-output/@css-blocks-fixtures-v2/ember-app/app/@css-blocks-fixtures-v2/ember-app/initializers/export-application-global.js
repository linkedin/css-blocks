import Ember from 'ember';
import config from '../config/environment';

export function initialize() {
  var application = arguments[1] || arguments[0];
  if (config.exportApplicationGlobal !== false) {
    var theGlobal;
    if (typeof window !== 'undefined') {
        theGlobal = window;
    } else if (typeof global !== 'undefined') {
        theGlobal = global
    } else if (typeof self !== 'undefined') {
        theGlobal = self;
    } else {
       // no reasonable global, just bail
       return;
    }

    var value = config.exportApplicationGlobal;
    var globalName;

    if (typeof value === 'string') {
      globalName = value;
    } else {
      globalName = Ember.String.classify(config.modulePrefix);
    }

    if (!theGlobal[globalName]) {
      theGlobal[globalName] = application;

      application.reopen({
        willDestroy: function() {
          this._super.apply(this, arguments);
          delete theGlobal[globalName];
        }
      });
    }
  }
}

export default {
  name: 'export-application-global',

  initialize: initialize
};
