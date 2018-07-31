import { module, setupApplicationTest, test, skip } from "ember-qunit";
import { visit, click, currentURL } from "@ember/test-helpers";

function varIsPresent(sel, name) {
  let el = document.querySelector(`#test-container ${sel}`);
  return window.getComputedStyle(el).getPropertyValue(`--${name}`).trim() === "applied";
}
function varIsNotPresent(sel, name) { return !varIsPresent(sel, name); }

module("Acceptance | Template Discovery", function(hooks) {
  setupApplicationTest(hooks);

  test("styles/app.css concatenation", async function(assert) {
    await visit("/global-styles");
    assert.equal(currentURL(), "/global-styles", "Navigated to test case");
    assert.ok(varIsPresent("#reset-stylesheet-selector", "reset-stylesheet-selector"), "Vanilla CSS styles in app.css are preserved");
  });

  skip("Ember Builtins Integration", async function(assert) {
    await visit("/ember-builtins", "Navigated to test case");
    assert.equal(currentURL(), "/ember-builtins");
    assert.ok(varIsPresent("#link-to-helper", "link-to-helper"), "Link-to helpers receive classes");
    assert.ok(varIsPresent("#link-to-helper-active", "link-to-helper-active"), "Link-to helpers receive active states");
    assert.ok(varIsPresent("#input-helper", "input-helper"), "Input helpers receive classes");
    assert.ok(varIsPresent("#textarea-helper", "textarea-helper"), "Textarea helpers receive classes");
  });

  test("App Route Block Integration", async function(assert) {
    await visit("/route-block");
    assert.equal(currentURL(), "/route-block", "Navigated to test case");
    assert.ok(varIsPresent("#scope", "route-block-scope"), "Scope style applied to root element");
    assert.ok(varIsPresent("#sub-class", "route-block-class"), "Sub-classes applied to children");
    assert.ok(varIsNotPresent("#scope", "route-block-scope-state"), "Scope state not applied when disabled");
    assert.ok(varIsNotPresent("#sub-class", "route-block-class-state"), "Sub-class state not applied when disabled");
    await click("#toggle-enabled");
    assert.ok(varIsPresent("#scope", "route-block-scope-state"), "Scope state applied when enabled");
    assert.ok(varIsPresent("#sub-class", "route-block-class-state"), "Sub-class state applied when enabled");
  });

  test("App Component Block Integration", async function(assert) {
    await visit("/app-component");
    assert.equal(currentURL(), "/app-component", "Navigated to test case");
    assert.ok(varIsPresent("#scope", "app-component-block-scope"), "Scope style applied to root element");
    assert.ok(varIsPresent("#sub-class", "app-component-block-class"), "Sub-classes applied to children");
    assert.ok(varIsNotPresent("#scope", "app-component-block-scope-state"), "Scope state not applied when disabled");
    assert.ok(varIsNotPresent("#sub-class", "app-component-block-class-state"), "Sub-class state not applied when disabled");
    await click("#toggle-enabled");
    assert.ok(varIsPresent("#scope", "app-component-block-scope-state"), "Scope state applied when enabled");
    assert.ok(varIsPresent("#sub-class", "app-component-block-class-state"), "Sub-class state applied when enabled");
  });

  test("Addon Component Block Integration", async function(assert) {
    await visit("/addon-component");
    assert.equal(currentURL(), "/addon-component", "Navigated to test case");
    assert.ok(varIsPresent("#scope", "addon-component-block-scope"), "Scope style applied to root element");
    assert.ok(varIsPresent("#sub-class", "addon-component-block-class"), "Sub-classes applied to children");
    assert.ok(varIsNotPresent("#scope", "addon-component-block-scope-state"), "Scope state not applied when disabled");
    assert.ok(varIsNotPresent("#sub-class", "addon-component-block-class-state"), "Sub-class state not applied when disabled");
    await click("#toggle-enabled");
    assert.ok(varIsPresent("#scope", "addon-component-block-scope-state"), "Scope state applied when enabled");
    assert.ok(varIsPresent("#sub-class", "addon-component-block-class-state"), "Sub-class state applied when enabled");
  });
});