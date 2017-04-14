CSS Blocks
==========

CSS Blocks are a way of writing highly decoupled and isolated styles that can be statically
analyzed for optimal delivery and runtime performance.

A Formalization of the BEM selector methodology.
------------------------------------------------

[BEM][bem] is a set of best practices for authoring CSS selectors which
if followed produces decoupled styles in a way that attempts to strike a balance
between developer ergonomics and browser performance trade-offs. In this
project we aim to both improve the developer ergonomics and to be able
to make strong guarantees about the CSS produced for optimizations.

Terminology
-----------

A CSS Block has 5 key concepts:

1. Block - A block is a set of interdependent styles. There is no way to
   write selectors that address elements from different blocks except in
   well defined ways.
2. Root - The root element of the block. All other element types must be
   contained in the html subtree of elements of this element.
3. State - This is a state that the block can be in. A state is the only
   construct that can have dependent styles with other element types
   through CSS combinators. States can be dynamic or static in nature.
   You can think of a state as a CSS class applied to the root element.
4. Element - An element within the block are styles that are specific to
   that block but that must be applied to one or more HTML element contained in
   the document subtree. You can think of this as a CSS class that is
   local to the block.
5. Substate - A Substate belong to an Element and can only be applied to
   an Element for which the state belongs. You can think of this as a
   CSS class that is also applied in conjunction with the element when the
   substate is set.

























[bem]: http://getbem.com/
