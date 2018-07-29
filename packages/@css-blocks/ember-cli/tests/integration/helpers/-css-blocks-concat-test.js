import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';

moduleForComponent('-css-blocks-concat', 'helper:-css-blocks-concat', {
  integration: true
});

test('it concats input', function(assert) {
  this.set('inputValue', '1234');

  this.render(hbs`{{-css-blocks-concat inputValue "foo"}}`);

  assert.equal(this.$().text().trim(), '1234foo');
});
