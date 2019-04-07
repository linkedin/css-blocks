import Controller from '@ember/controller';

export default Controller.extend({
  enabled: false,
  color: 'unset',

  actions: {
    toggleEnabled() {
      this.toggleProperty("enabled");
    },
    toggleColor() {
      this.set('color', this.get('color') === 'unset' ? 'yellow' : 'unset');
    }
  }
});