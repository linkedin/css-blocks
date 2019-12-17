import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';

setApplication(Application.create(config.APP));

start({
  // removes the additional framework onerror tests which are added by default
  // https://github.com/emberjs/ember-qunit/blob/master/tests/unit/setup-ember-onerror-validation-test.js
  setupEmberOnerrorValidation: false,
});
