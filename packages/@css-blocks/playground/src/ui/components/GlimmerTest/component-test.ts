import hbs from '@glimmer/inline-precompile';
import { setupRenderingTest } from '@glimmer/test-helpers';

const { module, test } = QUnit;

module('Component: GlimmerTest', function(hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function(assert) {
    await this.render(hbs`<GlimmerTest />`);
    assert.equal(this.containerElement.textContent, 'CSS Blocks Playground\n');
  });
});
