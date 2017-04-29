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
3. State Set - A state set is a group of mutually exclusive states.
   This makes it easier to switch between states in the set and allows
   the block compiler to check for inconsistent and invalid selectors.
4. Element - An element within the block are styles that are specific to
   that block but that must be applied to one or more HTML element contained in
   the document subtree. You can think of this as a CSS class that is
   local to the block.
5. Substate - A Substate belongs to an Element and can only be applied to
   an Element for which the state belongs. You can think of this as a
   CSS class that is also applied in conjunction with the element when the
   substate is set.

Syntax
------

By default, every class in a block is local to that block and represents
an Element.

State sets are inferred by finding all the states with a shared first
identifier.


The convention is to name a file according to the block: `form.block.scss`

Example:


```css
:block {
  margin: 2em 0;
  padding: 1em 0.5em;
}
:state(theme red) {
  color: #c00;
}
:state(theme blue) {
  color: #006;
}
:state(compact) {
  margin: 0.5em 0;
  padding: 0.5em 0.5em;
}


.input-area {
  display: flex;
  margin: 1em 0;
  font-size: 1.5rem;
  :state(compact) & {
    margin: 0.25em 0;
  }
}

.label {
  flex: 1fr;
}

.input {
  flex: 3fr;
  :state(theme red) & {
    border-color: #c00;
  }
  :state(theme blue) & {
    border-color: #006;
  }
}

.submit {
  width: 200px;
  &:substate(disabled) {
    color: gray;
  }
}
```

Which would compile from Sass to CSS to:

```css
:block { margin: 2em 0; padding: 1em 0.5em; }
:state(theme red) { color: #c00; }
:state(theme blue) { color: #006; }
:state(compact) { margin: 0.5em 0; padding: 0.5em 0.5em; }
.input-area { display: flex; margin: 1em 0; font-size: 1.5rem; }
:state(compact) .input-area { margin: 0.25em 0; }
.label { flex: 1fr; }
.input { flex: 3fr; }
:state(theme red) .input { border-color: #c00; }
:state(theme blue) .input { border-color: #006; }
.submit { width: 200px; }
.submit:substate(disabled) { color: gray; }
```

In BEM compatibility mode this would compile to:

```css
.form { margin: 2em 0; padding: 1em 0.5em; }
.form--theme-red { color: #c00; }
.form--theme-blue { color: #006; }
.form--compact { margin: 0.5em 0; padding: 0.5em 0.5em; }
.form__input-area { display: flex; margin: 1em 0; font-size: 1.5rem; }
.form--compact .form__input-area { margin: 0.25em 0; }
.form__label { flex: 1fr; }
.form__input { flex: 3fr; }
.form--theme-red .form__input { border-color: #c00; }
.form--theme-blue .form__input { border-color: #006; }
.form__submit { width: 200px; }
.form__submit--disabled { color: gray; }
```

Template Syntax
---------------

### Plain HTML

```html
<form class="form form--compact form--theme-red">
  <div class="form-input-area">
    <label class="form__label">Username</label>
    <input class="form__innput">
  </div> 
  <submit class="form__submit form__submit--disabled">
</form>
```

### JSX

Help

### Handlebars

Help

Global (application) States
---------------------------

We need a way to declare application states so they can be used within a
block.

Block Inheritance
-----------------

TBD

Block composition
-----------------

When composing blocks, any property conflicts will result in a build
error unless a resolution is provided by one of the blocks:

```scss
@reference "../components/accordian.block" as accordian;
@block .section;
.box {
  width: resolve(accordian.container); // override accordian.container
  width: 100%;
  border: 5px solid black;
  border: resolve(accordian.container); // yield to accordian.container
}
```

Composing blocks by the consuming app
-------------------------------------

If a third-party library failed to consider a composition, or if two
third-party libraries don't compose well, the app can provide it's own
composition of the necessary styles as it's own element.

File: `navigation.block.scss`

```scss
@reference "super-grid-system.block";
@reference "drop-downs.block";
@block .navigation;

.profile {
  composes: super-grid-system.span and drop-down.hoverable;
  float: resolve(super-grid-system.span);
  width: resolve(super-grid-system.span);
  margin: resolve(drop-down.hoverable);
}
```


TBD template example

Using pseudoclasses and pseudoelements
--------------------------------------

TBD example

Using tagnames in selectors
---------------------------

TBD

Violating Block Syntax
----------------------

Sometime a class comes from an external library or content comes from a
database and the only thing you can do is use them as is. For these
situations there are a number of strategies for violating the
recommended block syntax.

1. Declaring an external class. Details tbd.
2. Using scoped tagnames. Details tbd.

Detecting and Managing Block Collisions
---------------------------------------

It's possible for styles from multiple blocks to be applied
to the same element. In this situation, if the same property is declared
in both blocks (or if a short-hand is set in one and a long-hand is set
in another), a build error will result. The resolution
on a per property basis must be provided declaritively in the blocks.
if it cannot, then a new composed element in a higher-order block should
be defined that resolves the composition issue.

class=CSSBlock.compose(Block1.element1, Block2.element2);

Media Queries
-------------

TBD how media queries are handled.

Output
------

There can be BEM compatibilty output option where the above example would
produce the following CSS output:

```css
.form { margin: 2em 0; padding: 1em 0.5em; }
.form--theme-red { color: #c00; }
.form--theme-blue { color: #006; }
.form--compact { margin: 0.5em 0; padding: 0.5em 0.5em; }
.form__input-area { display: flex; margin: 1em 0; font-size: 1.5rem; }
.form--compact .form__input-area { margin: 0.25em 0; }
.form__label { flex: 1fr; }
.form__input { flex: 3fr; }
.form--theme-red .form__input { border-color: #c00; }
.form--theme-blue .form__input { border-color: #006; }
.form__submit { width: 200px; }
.form__submit--disabled { color: gray; }
```

By default, the classes would be generated and compact:

```css
.As5gVwYfYM { margin: 2em 0; padding: 1em 0.5em; }
.oL7NItprs9 { color: #c00; }
.kUQVcwUmGO { color: #006; }
.FC5WIu2Zis { margin: 0.5em 0; padding: 0.5em 0.5em; }

.CZv8iaixJY { display: flex; margin: 1em 0; font-size: 1.5rem; }
.FC5WIu2Zis .CZv8iaixJY { margin: 0.25em 0; }

.HuPJzBD60S { flex: 1fr; }

.az2IP9WB4p { flex: 3fr; }
.oL7NItprs9 .az2IP9WB4p { border-color: #c00; }
.kUQVcwUmGO .az2IP9WB4p { border-color: #006; }

.EPK1W2aAse { width: 200px; }
.gpctrpxsAv { color: gray; }
```

Interopating with `css-modules`
-----------------------------

There's a convention for importing and exporting values across different
css module systems. We should consider how we want to use and support
this.

https://github.com/css-modules/icss

Detecting Unused Styles
-----------------------

TBD: It should be possible to detect unused styles and prune
from the final build.

Compressing Classes
-------------------

There are few techniques being considered to compress classes:

0. *No compression*. Outputs standard BEM classes. This is good for when
   porting an existing code base from BEM to CSS Blocks until all
   templates can be updated.
1. *Truncated hashing* (with hash collision detection) - Hashing the BEM
   name is predictable and stable over time. The algorithm used above
   is a base64 encoding with `+` and `/` removed, then selecting 10
   bytes staring with the first non-numeric character. We then need
   to ensure no hash collisions occur across blocks. Hash collisions
   will be rare, but we would pre-allocate a few hundred hashes to be
   used to resolve any any hash collisions we encounter. The collision
   resolution must be stable across builds that do not introduce new
   collisions.
2. *Counter hashing*. Every time we need a new identifier we increment a
   counter. This strategy works fine for within a single block. We don't
   need to ensure cache consistency once a block changes. But we
   must ensure uniqueness across all blocks. To this end, we would need to
   set a maximum number of identifers in a block so that we can reserve
   higher order bits for counting files themselves in a stable way.
   Addition of new files over time would cause larger than expected cache
   invalidations unless we have a hand maintained file number for each
   block file and even if files are added or removed we would keep the same
   file number for blocks. This process can be automated by a script that
   detects added or removed block files and updates the counters file
   accordingly. In theory, this technique generates smaller output but
   for additional developer complexity.
3. *Localized*. This stragey would keep the local names for a block but
   scope them with a unique identifier to avoid users being able to
   predict the classnames while still preserving some developer
   familiarity when reading the output. This might be best for
   development mode.
4. *Content hashing*. This strategy produces predictable classnames which
   means that developers **could** abuse them if they wanted to.
   However, this approach also means that class names can be deduplicated
   across files built separately in downstream processing and exracted to
   a shared file. It also means that a custom brotli dictionary could be
   produced that would allow the most common class names to be efficiently
   compressed across templates and css files.

Ultimately, the project should support all of these compression
strategies and allow one to be selected via configuration.
























[bem]: http://getbem.com/
