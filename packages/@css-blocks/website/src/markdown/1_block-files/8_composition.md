---
name: Composition
title: Block Composition
---

Every templating syntax will have some method for composing classes from multiple Blocks on to a single element. Ex:

```handlebars
<div class="class1 class2"></div>
```

However, it can be repetitive to compose styles in-template. You will often encounter situations where you *always* want two classes to be used together. In situations like these, in-stylesheet composition will be your friend.

In-stylesheet composition allows you to say "wherever I use this style, also apply this one". You can compose two styles using the `composes` property in your Block file. For example:

```css
/* elevations.block.css */
.lvl1 {
  box-shadow: 0 0 0 10px rgba(0,0,0,.15);
}

.lvl2 {
  box-shadow: 0 0 0 20px rgba(0,0,0,.15);
}

.lvl3 {
  box-shadow: 0 0 0 30px rgba(0,0,0,.15);
}
```

```css
/* component.block.css */
@block elevation from "./elevation.block.css";

:scope {
  composes: elevation.lvl2;
}

:scope[state|active] {
  composes: elevation.lvl2;
}

.element {
  composes: elevation.lvl1;
}

.element:hover {
  composes: elevation.lvl3;
}
```

In the above example, whenever an element in our template matches one of the selectors in our Block, we will also apply the specified style from our imported elevation Block.

However! Unlike the now well-known `@include` or `@extend` directives from SASS, `composes` will actually apply the correct combination of classes *in template* instead of duplicating CSS. This means that:

```handlebars
<div class="class2 other.class1">
```
is functionally equivalent to the following (but you only have to use `class2` in the template):
```css
@block other from "other.block.css";

.class2 {
  composes: other.class1;
}
```
