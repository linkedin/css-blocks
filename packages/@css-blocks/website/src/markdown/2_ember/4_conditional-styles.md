---
name: Conditional Styles
title: Conditional Styles
---

Up until now, we have only seen static styles – but what if you need to change the style of your site based on runtime logic?

With CSS Blocks you can conditionally apply both your `.class` and `[state]` selectors using regular handlebars syntax.

## Dynamic `.class` Application

The CSS Blocks Ember addon delivers two special helpers: `{{style-if}}` and `{{style-unless}}`. These helpers are only allowed to be used inside of an element's `class` attribute. If you try and use them elsewhere, or use any other helper inside of an element's `class` attribute, you will get a build time error.

The `{{style-if}}` and `{{style-unless}}` helpers are specially crafted to enable dynamic Block class application, while still ensuring static analysis at build time.

#### Style-If
```handlebars
<el class="{{style-if condition "truthyClass"[ "falsyClass"]}}" />
```
The `{{style-if}}` helper will apply the `"truthyClass"` if `condition` is truthy. An optional `"falsyClass"` may be passed to be applied if `condition` is falsy. Both `"truthyClass"` and `"falsyClass"` must be references to a CSS Blocks `.class` in scope. If the class does not exist, a build time error will be thrown.

#### Style-Unless
```handlebars
<el class="{{style-unless condition "falsyClass"[ "truthyClass"]}}" />
````
The `{{style-unless}}` helper will apply the `"falsyClass"` if `condition` is falsy. An optional `"truthyClass"` may be passed to be applied if `condition` is truthy. Both `"truthyClass"` and `"falsyClass"` must be references to a CSS Blocks `.class` in scope. If the class does not exist, a build time error will be thrown.

> **Feature Note**: The `{{style-if}}` and `{{style-unless}}` helpers may **only** be used in an element's `class` attribute. If it is seen anywhere else in your template, a build time error will be thrown.

You can also mix and match any number of conditional style helpers with static classes like so:

```css
/* styles/elevation.block.css */
.e1 { box-shadow: 0 0 0 10px black; }
```

```css
/* styles/component.block.css */
.class-one { /* ... */ }
.class-two { /* ... */ }

@export elevation from "./elevation.block.css";
```

```handlebars
{{!-- templates/component.hbs --}}
<main>
  <section class="elevation.e1 {{style-if condition "class-one" "class-two"}}">
</main>
```

Just keep in mind: CSS Blocks enforces one class per Block, per element. If there exists a possible application state where two classes from the same Block may be applied to

## Dynamic `[state]` Application

States are represented as attributes in Ember templates. You can effect their application by setting dynamic values.

#### Boolean States
Boolean states will be applied or not applied based on the truthyness of the value:

```css
:scope[state:active] { /* ... */ }
```
```handlebars
<el state:active={{isActive}}>
```

#### Sub-States
States that have sub-states will be applied *only* if the value matches the sub-state:

```css
:scope[state:color="red"] { /* ... */ }
:scope[state:color="green"] { /* ... */ }
:scope[state:color="blue"] { /* ... */ }
```
```handlebars
<el state:color={{currentColor}}>
```