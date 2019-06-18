---
name: Composing Styles
title: Composing Styles
---

A single Block file per template is all well and good, but it is common practice to mix and match styles from other Blocks in your template. In Ember, any Block re-exported with `@export` will also be available for use in your template.

When you reference styles from an `@export` directive, they must be prefixed with their local Block name to differentiate from any local styles of the same name.

Exported Blocks' `:scope` is not restricted to the root of template tree. You can apply it to any element by using its local name as a class.

For example:

```css
/* /styles/elevation.block.css */
:scope[state|inverse]
.e1 { box-shadow: 0 0 0 1px rgba(0, 0, 0, .15); }
.e2 { box-shadow: 0 0 0 4px rgba(0, 0, 0, .15); }
.e3 { box-shadow: 0 0 0 8px rgba(0, 0, 0, .15); }

:scope[state|inverse] .e1 { box-shadow: 0 0 0 1px rgba(255, 255, 255, .15); }
:scope[state|inverse] .e2 { box-shadow: 0 0 0 4px rgba(255, 255, 255, .15); }
:scope[state|inverse] .e3 { box-shadow: 0 0 0 8px rgba(255, 255, 255, .15); }
```

```css
/* /styles/application.block.css */
@block elevation from "./elevation.block.css";

:scope {
  background: gray;
}

.container {
  background: white;
}

@export ( elevation as shadow );
```

```handlebars
{{!-- /templates/application.hbs --}}
<main> {{!-- :scope is automagically applied --}}
  <section class="container shadow.e2">I have a black shadow!</section>

  <section class="shadow" state:shadow.inverse>
    <div class="container shadow.e2">I have a white shadow</div>
  </section>
</main>
```

> **Feature Note**: If two composed classes style the same CSS property, you will have to provide an explicit Style Resolution. To learn more about CSS Block's `resolve()` function, check out our documentation on [Conflict Resolution](../block-files/conflict-resolution).