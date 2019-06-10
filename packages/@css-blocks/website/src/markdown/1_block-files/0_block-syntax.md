---
name: Block Files
title: Block Files
---

So you want to learn how to write CSS Blocks like Picasso uses a paintbrush? Well, if you finish all parts of this section I have good news for you! Your stylesheets may not hang in the Lourve, but you'll officially be a master of cubism (get it?).

Regardless of the template or build integration you select for your project, you will be writing the same kind of stylesheets when using CSS Blocks in your application.

**Block Files** are isolated stylesheets, written in their own file, that contain logically related styles – like for a component or design pattern.

As you will discover in this section, the styles you write inside of Block Files are Just CSS!™️ (mostly).

Blocks enforce a restricted subset of the CSS language that help promote best practices, DRY code, and ensure styles written can be statically analyzed. This means you will receive a build time error if you use a syntax that is not allowed. You will learn these simple rules in the section called [Selector Rules](/learn/block-files/selector-rules).

Typically, a single Block will contain styles for a particular component or concept, but Blocks don't live in a vacuum! it is entirely natural – and encouraged – for a Block or template to consume many other Blocks and compose them together through a number of different methods. You will learn how to `import`, `compose`, `extend`, and `export` Blocks in later parts of this section.

At their most simple, a Block file consists of:

 - Scope Selectors
 - Class Selectors
 - State Selectors with optional Substates
 - Block imports and exports
 - Media queries

And the code you're going to learn how to write should look pretty darn familiar:
 > TODO: Code sample of a typical Block File here.

Ready to learn how all these pieces work together, and [become a CSS Blocks master](TODO:-Pokemon-Theme-Song)? Great! Lets dive in.
