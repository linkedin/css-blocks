import Component from '@ember/component';
import layout from '../templates/components/app-component';

export default Component.extend({
  layout,
  enabled: false,

  actions: {
    toggleEnabled() {
      this.toggleProperty("enabled");
    }
  }
});
