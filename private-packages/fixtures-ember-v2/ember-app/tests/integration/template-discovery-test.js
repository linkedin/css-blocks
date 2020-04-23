import { module, setupApplicationTest, test, skip } from "ember-qunit";
import { visit, click, currentURL } from "@ember/test-helpers";

function varIsPresent(sel, name) {
  let el = document.querySelector(`#test-container ${sel}`);
  return window.getComputedStyle(el).getPropertyValue(`--${name}`).trim() === "applied";
}

function propApplied(sel, prop, val) {
  let el = document.querySelector(`#test-container ${sel}`);
  const d = document.createElement("div");
  d.style[prop] = val;
  document.body.appendChild(d);
  val = window.getComputedStyle(d).getPropertyValue(prop);
  d.remove();
  return window.getComputedStyle(el).getPropertyValue(prop).trim() === val;
}

const colorApplied = (sel, color) => propApplied(sel, "color", color);
const isBold = (sel) => propApplied(sel, "font-weight", "bold");
const isItalic = (sel) => propApplied(sel, "font-style", "italic");
const varIsNotPresent = (sel, name) => !varIsPresent(sel, name);

module("Acceptance | Template Discovery", function(hooks) {
  setupApplicationTest(hooks);

  test("styles/app.css concatenation", async function(assert) {
    await visit("/global-styles");
    assert.equal(currentURL(), "/global-styles", "Navigated to test case");
    assert.ok(varIsPresent("#reset-stylesheet-selector", "reset-stylesheet-selector"), "Vanilla CSS styles in app.css are preserved");
  });

  test("Ember Builtins Integration", async function(assert) {
    await visit("/ember-builtins", "Navigated to test case");
    assert.equal(currentURL(), "/ember-builtins");
    assert.ok(varIsPresent("#link-to-helper", "link-to-helper"), "Link-to helpers receive classes");
    assert.ok(varIsPresent("#link-to-helper-active", "link-to-helper-active"), "Link-to helpers receive active states");
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
    assert.ok(varIsPresent("#addon-component-scope", "addon-component-block-scope"), "Scope style applied to root element");
    assert.ok(varIsPresent("#addon-component-sub-class", "addon-component-block-class"), "Sub-classes applied to children");
    assert.ok(varIsNotPresent("#addon-component-scope", "addon-component-block-scope-state"), "Scope state not applied when disabled");
    assert.ok(varIsNotPresent("#addon-component-sub-class", "addon-component-block-class-state"), "Sub-class state not applied when disabled");
    await click("#toggle-enabled");
    assert.ok(varIsPresent("#addon-component-scope", "addon-component-block-scope-state"), "Scope state applied when enabled");
    assert.ok(varIsPresent("#addon-component-sub-class", "addon-component-block-class-state"), "Sub-class state applied when enabled");
  });

  test("Eager Engine Block Integration", async function(assert) {
    await visit("/@css-blocks-fixtures-v2/ember-engine");
    assert.equal(currentURL(), "/@css-blocks-fixtures-v2/ember-engine", "Navigated to test case");
    assert.ok(varIsPresent("#eager-engine-scope", "in-repo-eager-engine-scope"), "Scope style applied to root element");

    assert.ok(varIsPresent("#addon-component-scope", "addon-component-block-scope"), "Scope style applied to root element");
    assert.ok(varIsPresent("#addon-component-sub-class", "addon-component-block-class"), "Sub-classes applied to children");
    assert.ok(varIsNotPresent("#addon-component-scope", "addon-component-block-scope-state"), "Scope state not applied when disabled");
    assert.ok(varIsNotPresent("#addon-component-sub-class", "addon-component-block-class-state"), "Sub-class state not applied when disabled");
    await click("#toggle-enabled");
    assert.ok(varIsPresent("#addon-component-scope", "addon-component-block-scope-state"), "Scope state applied when enabled");
    assert.ok(varIsPresent("#addon-component-sub-class", "addon-component-block-class-state"), "Sub-class state applied when enabled");
  });

  skip("Lazy Engine Block Integration", async function(assert) {
    await visit("/@css-blocks-fixtures-v2/ember-lazy-engine");
    assert.equal(currentURL(), "/@css-blocks-fixtures-v2/ember-lazy-engine", "Navigated to test case");
    assert.ok(varIsPresent("#scope", "in-repo-lazy-engine-scope"), "Scope style applied to root element");
  });

  test("Static and Dynamic In Stylesheet Class Composition.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#red-static", "red"), "Static class compositions work.");
    assert.ok(isBold("#red-static"), "Inherited compositions are applied.");
    assert.ok(colorApplied("#green-static", "green"), "Static class compositions work.");
    assert.ok(colorApplied("#red-green-dynamic", "red"), "Dynamic class compositions work.");
    assert.ok(isBold("#red-green-dynamic"), "Inherited compositions are applied.");
    await click("#toggle-enabled");
    assert.ok(colorApplied("#red-green-dynamic", "green"), "Dynamic class compositions work when changed.");
    assert.ok(!isBold("#red-green-dynamic"), "Inherited compositions are removed.");
    await click("#toggle-enabled");
  });

  test("Static and Dynamic In Stylesheet State Composition.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#pink-static", "pink"), "Static state compositions work.");
    assert.ok(isItalic("#pink-static"), "The state's base class is automatically applied.")
    assert.ok(colorApplied("#purple-static", "purple"), "Static state compositions work.");
    assert.ok(isItalic("#purple-static"), "The state's base class is automatically applied.")
    assert.ok(colorApplied("#pink-purple-dynamic", "purple"), "Dynamic state compositions work.");
    assert.ok(isItalic("#pink-purple-dynamic"), "The state's base class is automatically applied.")
    await click("#toggle-enabled");
    assert.ok(colorApplied("#pink-purple-dynamic", "pink"), "Dynamic state compositions work.");
    assert.ok(isItalic("#pink-purple-dynamic"), "The state's base class is automatically applied.")
    await click("#toggle-enabled");
  });

  test("Static and Dynamic In Stylesheet State Composition Gated By Boolean State.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#blue-static", "black"), "Static state compositions work gated by a boolean state.");
    assert.ok(colorApplied("#blue-active", "blue"), "Static state compositions work gated by a boolean state.");
    assert.ok(colorApplied("#blue-dynamic", "black"), "Dynamic state compositions work gated by a boolean state – inactive.");
    await click("#toggle-enabled");
    assert.ok(colorApplied("#blue-dynamic", "blue"), "Dynamic state compositions work gated by a boolean state – active.");
    await click("#toggle-enabled");
  });

  test("Static and Dynamic In Stylesheet Class Composition Gated By Boolean State.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#orange-static", "black"), "Static class compositions work gated by a boolean state.");
    assert.ok(colorApplied("#orange-active", "orange"), "Static class compositions work gated by a boolean state.");
    assert.ok(colorApplied("#orange-dynamic", "black"), "Dynamic class compositions work gated by a boolean state – inactive.");
    await click("#toggle-enabled");
    assert.ok(colorApplied("#orange-dynamic", "orange"), "Dynamic class compositions work gated by a boolean state – active.");
    await click("#toggle-enabled");

  });

  test("Static and Dynamic In Stylesheet State Composition Gated By Switch State.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#yellow-static", "black"), "Static state compositions work gated by a switch state.");
    assert.ok(colorApplied("#yellow-active", "yellow"), "Static state compositions work gated by a switch state.");
    assert.ok(colorApplied("#yellow-dynamic", "black"), "Dynamic state compositions work gated by a switch state – inactive.");
    await click("#toggle-color");
    assert.ok(colorApplied("#yellow-dynamic", "yellow"), "Dynamic state compositions work gated by a switch state – active.");
    await click("#toggle-color");

  });

  test("Static and Dynamic In Stylesheet Class Composition Gated By Switch State.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#brown-static", "black"), "Static class compositions work gated by a switch state.");
    assert.ok(colorApplied("#brown-active", "brown"), "Static class compositions work gated by a switch state.");
    assert.ok(colorApplied("#brown-dynamic", "black"), "Dynamic class compositions work gated by a switch state – inactive.");
    await click("#toggle-color");
    assert.ok(colorApplied("#brown-dynamic", "brown"), "Dynamic class compositions work gated by a switch state – active.");
    await click("#toggle-color");
  });

  test("Dynamic In Stylesheet Composition Gated By Dynamic Switch State.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#yellow-brown-dynamic", "black"), "Conditional applications and state switches work well together – 1");
    await click("#toggle-enabled");
    assert.ok(colorApplied("#yellow-brown-dynamic", "black"), "Conditional applications and state switches work well together – 2");
    assert.ok(!isItalic("#yellow-brown-dynamic"), "When attribute gate is not met, composition parent class is not applied.");
    await click("#toggle-enabled");
    await click("#toggle-color");
    assert.ok(colorApplied("#yellow-brown-dynamic", "brown"), "Conditional applications and state switches work well together – 3");
    await click("#toggle-enabled");
    assert.ok(colorApplied("#yellow-brown-dynamic", "yellow"), "Conditional applications and state switches work well together – 4");
    assert.ok(isItalic("#yellow-brown-dynamic"), "When attribute gate is met, composition parent class is applied.");
    await click("#toggle-color");
    assert.ok(!isItalic("#yellow-brown-dynamic"), "Composition parent class is removed when class is switched.");
    assert.ok(colorApplied("#yellow-brown-dynamic", "black"), "Conditional applications and state switches work well together – 5");
  });

  test("Multiple In Stylesheet Compositions.", async function(assert) {
    await visit("/compositions");
    assert.equal(currentURL(), "/compositions", "Navigated to test case");
    assert.ok(colorApplied("#green-bold", "green"), "Multiple compositional classes applied – color");
    assert.ok(isBold("#green-bold"), "Multiple compositional classes applied – font-weight");
  });
});