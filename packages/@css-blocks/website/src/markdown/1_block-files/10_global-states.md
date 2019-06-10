---
name: Global States
title: Global States
---

In rare occasions, a Block may choose to declare declare that a certain State is **global**. These states are special in that they can be used in other Blocks like they are local to that block.

This is most useful for global application states – like during initial application boot, or when a modal is displayed.

> ⚙️ **Performance Note: Global States**
> 
> When you apply classes and other attributes to elements like `<html>` or `<body>` it invalidates a lot of internal caches in the browser. It is still often a performance win compared to querying the document in javascript and applying classes on many elements.

```css
/* application.block.css */

@block-global [state|is-loading];
@block-global [state|is-saving];
```

```css
/* navigation.block.css */

@block app from "application.block.css";

/* Gray out signout button when app is saving */
app[state|is-saving] .signout {
  color: gray;
  pointer-events: none;
}

/* Animate the logo when app is loading data */
app[state|is-loading] .logo {
  animation-name: bounce;
}
```