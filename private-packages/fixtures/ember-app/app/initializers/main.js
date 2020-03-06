import { registerDeprecationHandler } from '@ember/debug';

const DEPRECATIONS_TO_SILENCE = {
  'ember-views.curly-components.jquery-element': true,
};

function shouldSilenceDeprecationById(deprecationId = '') {
  return DEPRECATIONS_TO_SILENCE[deprecationId];
}

export function initialize() {
  registerDeprecationHandler((message, options, next) => {
    if (options && shouldSilenceDeprecationById(options.id)) {
      return;
    } else {
      next(message, options);
    }
  });
}

export default { initialize };