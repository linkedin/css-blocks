import Controller from '@ember/controller';

export default Controller.extend({
  enabled: false,
  color: 'none',

  actions: {
    toggleEnabled() {
      this.toggleProperty("enabled");
    },
    toggleColor() {
      this.set('color', this.get('color') === 'none' ? 'yellow' : 'none');
    }
  }
});