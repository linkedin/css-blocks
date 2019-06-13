---
name: Global States
title: Global States
---

In rare occasions, a Block may choose to declare that a certain State is **global**. These states are special in that they can be used in other Blocks like they are local to that block.

One common use for this feature is to put an application into a well known state  – like during initial application boot, or when a modal is displayed. Then, other blocks can use the global state to create descendant selectors that react to that state.

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
