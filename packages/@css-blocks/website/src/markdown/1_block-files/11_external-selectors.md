---
name: External Selectors
title: External Selectors
---

Sometime a class, identifier, or tag name comes from an external source, and the only thing you can do is use them as is. In these situations the Block must declare all external simple selectors it intendeds to use. These simple selectors may then be used as key selectors inside this Block. You'll get an error for any declared external selectors that aren't used or if they are used in the context selector.

Styles targeting an external selector are not rewritten and their declarations cannot be optimized! Style collisions
on an external selector are not detected or resolved. As a result, it is allowed to use `!important` on declarations targeting an external selector.

```css
@external h2.some-rando-class;

.foo h2.some-rando-class {
  font-size: 32px !important;
}
```

> Warning: If external selectors and CSS Block selectors both target the same HTML element in their key selectors you will get unpredictable results. It's best to avoid this.