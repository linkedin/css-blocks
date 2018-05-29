import { module, test } from 'qunit';
import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';
import { find } from 'ember-native-dom-helpers';

module('Acceptance | styles applied', function(hooks) {
  setupApplicationTest(hooks);

  test('route stylesheet is applied', async function(assert) {
    await visit('/posts/new');
    assert.equal(getComputedStyle(find('[data-test="posts-new-h3"]')).color, 'rgb(0, 128, 0)');
  });

  test('block reference style is applied', async function(assert) {
    await visit('/posts/new');
    assert.equal(getComputedStyle(find('[data-test="posts-new-h3"]'))['font-style'], 'italic');
  });
});
