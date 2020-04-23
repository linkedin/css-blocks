import Controller from '@ember/controller';

export default Controller.extend({
  enabled: false,

  actions: {
    toggleEnabled() {
      this.toggleProperty("enabled");
    }
  }
});