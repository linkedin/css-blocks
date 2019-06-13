---
name: Debugging
title: Debugging Your Blocks
---

Often you may have a reference to a block but aren't sure what styles
are in its public interface. The `@block-debug` at-rule allows you to
inspect the block's classes and states, and to see what classnames they will compile to.

You must also tell the debug statement where to output the information.

`@block-debug <block-name> to (comment|stderr|stdout)`

Example:

```css
@block icons from "../../shared/styles/icons/dark.block.css";
@block-debug icons to comment;
```

This might produce something like the following (when in BEM-compatible output mode):

```css
/* Source: shared/styles/icons/dark.block.css
   Extends: shared/styles/icons/base.block.css
   .root => .dark .base
   [state|hoverable] => .base--hoverable
   [state|shade="gray"] => .dark--shade-gray
   [state|shade="red"] => .dark--shade-red
   [state|shade="blue"] => .dark--shade-blue
   .icon => .dark__icon .base__icon
   .new-file => .dark__new-file .base__new-file
   .save-file => .dark__save-file .base__save-file
   .rm-file => .dark__rm-file .base__rm-file */
```
