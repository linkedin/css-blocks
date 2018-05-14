Every software library, framework, and tool makes trade-offs to optimize some
use cases at the expense of others and this one is no exception. This
document describes some specific use cases that if they are important to you,
may indicate that this software is not a good choice for your needs. In
writing this, it is our hope that we can avoid a point in the future where
your needs for a feature from this software is at odds with the long term
plans or a fundamental design of this project.

# Contraindicators

## Runtime styles that aren't enumerated.

When runtime settings can be enumerated, there is always a statically
analyzable build that can select from among those styles. But when the styles
cannot be bounded to a static set, a runtime setting cannot be used to select 
a style in a way that is compatible with the static analysis requirements of
CSS Blocks.

There are ways to manage this if there are well-defined style properties or
settings that can be expressed as CSS custom properties. Inline styles have a
specificity that is greater than any style that can be produced by CSS Blocks
and can be safely used to set styles at runtime, but inline styles have
limitations, especially around being able to address psuedo-elements and
pseudo-classes.

These issues only become especially problematic if they need to be applied to
elements that are also styled by styles written with CSS Blocks. The template
analyzers and rewriters are likely to give errors when application code
attempts to use a runtime setting to apply such styles to an analyzed attribute.

Arbitrary javascript can, of course, be used to circumvent these errors in
various "clever" ways such as copying the runtime optimized classes from an
observed hidden element onto another element. Doing so may work with the
current application but break later when the optimizer finds a new
optimization opportunity. It may break later when the implementation of CSS
Blocks or Opticss changes or new optimization strategies are introduced.

Features that imply the use of runtime styles that have this quality include
the following:

* Selectors or values for attributes stored in a database to control
  the style of an element.
* Complex themes and white-labeling requirements, especially when new
  implementations are constructed by runtime user interfaces that
  expose generalized stylesheet authoring abilities that do not participate
  in the application build process.

## User interface that can't be compiled.

## Combined with styles that aren't CSS Blocks.

## User interface that must be built separately.

## Novice engineers unskilled at debugging

## Support for user stylesheets
