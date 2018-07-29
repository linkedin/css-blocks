import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('-css-blocks-classnames', 'helper:-css-block-classnames', {
  integration: true
});

  // Example taken from @css-blocks/glimmer test suite. Actual helper is fully tested there.
test('it renders', function(assert) {

  this.set('active', true);
  this.render(hbs`{{-css-blocks-classnames 1 4 0 active 2 0 2 1 1 "a" 0 "b" 1 "c" 2 "d" 3}}`);
  assert.equal(this.$().text().trim(), 'a c');

  this.set('active', false);
  assert.equal(this.$().text().trim(), 'b');
});
