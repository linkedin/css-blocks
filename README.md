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

1. Block - A block is a set of interdependent styles that exist in isolation
   from styles in other Blocks. A block has a name.
2. Root - The root element of the block. All other HTML elements assigned styles
   from a Block must be contained in the HTML subtree of elements of the
   block's root.
3. State - Blocks can be in different states. A state can be a simple toggle
   (on/off) or it can have an enumerated set of values. State names and values
   must be legal CSS identifiers.
4. Class - All CSS classes within the block are styles that are specific to
   that block and must only be applied to HTML elements contained in the
   block's root element's subtree.
5. Substate - A Substate is like a state except that it belongs to a single class
   within the block. Substates can have the same name as other states and substates
   but they are distinct from each other except by developer convention.

Syntax
------

The convention is to name a file according to the block: `my-form.block.scss`

Example:

```css
@namespace state url(http://css-blocks.com/state);
@namespace substate url(http://css-blocks.com/substate);

// If you omit the name of the root here it is inferred according to the filename.
[state|root="my-form"] {
  margin: 2em 0;
  padding: 1em 0.5em;
}

[state|theme=red] {
  color: #c00;
}

[state|theme=blue] {
  color: #006;
}

[state|compact] {
  margin: 0.5em 0;
  padding: 0.5em 0.5em;
}


.input-area {
  display: flex;
  margin: 1em 0;
  font-size: 1.5rem;
  [state|compact] & {
    margin: 0.25em 0;
  }
}

.label {
  flex: 1fr;
}

.input {
  flex: 3fr;
  [state|theme=red] & {
    border-color: #c00;
  }
  [state|theme=blue] & {
    border-color: #006;
  }
}

.submit {
  width: 200px;
  &[substate|disabled] {
    color: gray;
  }
}
```

Which would compile from Sass to CSS to:

```css
[state|root="my-form"] { margin: 2em 0; padding: 1em 0.5em; }
[state|theme=red] { color: #c00; }
[state|theme=blue] { color: #006; }
[state|compact] { margin: 0.5em 0; padding: 0.5em 0.5em; }
.input-area { display: flex; margin: 1em 0; font-size: 1.5rem; }
[state|compact] .input-area { margin: 0.25em 0; }
.label { flex: 1fr; }
.input { flex: 3fr; }
[state|theme=red] .input { border-color: #c00; }
[state|theme=blue] .input { border-color: #006; }
.submit { width: 200px; }
.submit[substate|disabled] { color: gray; }
```

In BEM compatibility mode this would compile to:

```css
.my-form { margin: 2em 0; padding: 1em 0.5em; }
.my-form--theme-red { color: #c00; }
.my-form--theme-blue { color: #006; }
.my-form--compact { margin: 0.5em 0; padding: 0.5em 0.5em; }
.my-form__input-area { display: flex; margin: 1em 0; font-size: 1.5rem; }
.my-form--compact .my-form__input-area { margin: 0.25em 0; }
.my-form__label { flex: 1fr; }
.my-form__input { flex: 3fr; }
.my-form--theme-red .my-form__input { border-color: #c00; }
.my-form--theme-blue .my-form__input { border-color: #006; }
.my-form__submit { width: 200px; }
.my-form__submit--disabled { color: gray; }
```

Template Syntax
---------------

### Plain HTML

```html
<html xmlns:state="http://css-blocks.com/state"
      xmlns:substate="http://css-blocks.com/substate">
<form state:root="my-form" state:compact state:theme="red">
  <div class="input-area">
    <label class="label">Username</label>
    <input class="input">
  </div> 
  <submit class="submit" substate:disabled>
</form>
</html>
```


### JSX

Help

### Ember/Glimmer (Handlebars)

Each component has an assocated `styles.block.css` file.

The template root element is automatically the block root.

```hbs
<form state:compact state:theme="red">
  <div class="input-area">
    <label class="label">Username</label>
    <input class="input">
  </div> 
  <submit class="submit" substate:disabled>
</form>
```

Because the output of CSS Blocks is always classnames, templates are
rewritten during the build. Setting `state` attributes at runtime will
have no effect. If in BEM output mode, the above template is re-written to:

```hbs
<form class="my-form--compact my-form--theme-red">
  <div class="my-form__input-area">
    <label class="my-form__label">Username</label>
    <input class="my-form__input">
  </div> 
  <submit class="my-form__submit my-form__submit--disabled">
</form>
```

#### Using styles from several blocks

To use styles from other blocks you must create a block reference in
the current component's styles:

`my-component/styles.block.css`

```css
@block-reference icons from "../../shared/styles/icons";

[state|root] {
  border: 1px solid black;
  overflow: auto;
}

.icon {
  float: left;
  width: 26px;
  height: 26px;
}
```

`my-component/template.hbs`

```hbs
<div state:root="icons" state:icons.hoverable>
  <div class="icon icons.new" >New File</div>
  <div class="icon icons.save">Save File</div>
  <div class="icon icons.undo">Undo</div>
  <div class="icon icons.print">Print</div>
</div>
```

In BEM output mode this would compile to:

```hbs
<div class="my-component icons icons--hoverable">
  <div class="my-component__icon icons__new" >New File</div>
  <div class="my-component__icon icons__save">Save File</div>
  <div class="my-component__icon icons__undo">Undo</div>
  <div class="my-component__icon icons__print">Print</div>
</div>
```

In addition for the elements that reference styles across blocks,
this would generate a `css-optimization-hints.json` file:

```json
{
  "template": "my-component/template.hbs",
  "classIntersections": [
    ["my-component", "icons", "icons--hoverable"],
    ["my-component__icon", "icons__new"],
    ["my-component__icon", "icons__save"],
    ["my-component__icon", "icons__undo"],
    ["my-component__icon", "icons__print"],
  ]
}
```

#### Dynamic styles

In order to return class names dynamically to the template that
reference the styles in the stylesheet, you can import the styles
directly and use the imported component. 

Properties that return style references from the stylesheet must
also provide metadata that enumerates all the possible styles that might
be returned. the static `styleMetaData` property on the component class
is invoked during template rewriting to understand how dynamic styles
might interact with the stylesheets and to validate that they are used
correctly.

* `styles.root()` - retuns a reference to a root styles for a block.
* `styles.state(name: string, value?: string)` - returns a reference to a
  state for the given name and optional value.
* `styles.className(name: string)` - retuns a reference to a class name.
* `styles.substate(className: string, name: string, value?: string)` - retuns a reference to a class name.
* `styles.ref(blockName: string)` -- returns another block's style's
  which has all of these same methods on it. The name is either the
  local name specified for the block or the natural name of the block if
  no local name was specified.

To return the styles of several elements together use the
`cssBlocks.union(...styles)` method. This ensures that the
classes returned are correct, deduplicated, legal to be used
together, and can still provide hints correctly to the css optimizer.


```ts
import Component from "@glimmer/component";
import { cssBlocks } from "css-blocks";
import styles from "./styles.block.css";

export default class MyForm extends Component {
  static get styleMetaData() {
    return {
      themeColor: [
        styles.state("theme", "red"),
        styles.state("theme", "blue")
      ],
      submitButton: [
        styles.className('submit'),
        cssBlocks.union(styles.className('submit'), styles.substate('submit', 'disabled'))
      ]
    }
  }

  get isDisabled()
    return true;
  }

  get themeColor() {
    // raises an error if @currentTheme isn't a state value for theme from the css file.
    return styles.state("theme").value(this.args.currentTheme);
  }

  get submitButtonClass() {
    if (this.isDisabled) {
      return cssBlocks.union(styles.className('submit'),
                             styles.substate('submit', 'disabled'));
    } else {
      return styles.className('submit');
    } 
  }
}

```


```hbs
<form state:compact state:theme={{themeColor}}>
  <div class="input-area">
    <label class="label">Username</label>
    <input class="input">
  </div> 
  <submit class="submit" substate:disabled={{isDisabled}}>
  <!-- same as above but done differently -->
  <submit class={{submitButtonClass}}>
</form>
```

which gets rewritten in BEM output mode to:

```hbs
<form class="my-form my-form--compact {{themeColor}}">
  <div class="my-form__input-area">
    <label class="my-form__label">Username</label>
    <input class="my-form__input">
  </div> 
  <submit class="my-form__submit {{if isDisabled 'my-form__submit--disabled'}}">
  <!-- same as above but done differently -->
  <submit class={{submitButtonClass}}>
</form>
```

As noted in the section "External Selectors" below, any classnames that
should be left alone in the template and not considered part of the
current block, must be declared `@external`.


Global (application) States
---------------------------

A block can declare that a state is global. These states are special
in that they can be used in combinators in other blocks like any state
from that block.

This is most useful for global application states like during initial
application boot.

Performance note: when you apply classes and other attributes to
elements like `<html>` or `<body>` it invalidates a lot of internal
caches in the browser. It is still often a performance win compared to
querying the document in javascript and applying classes on many
elements.

`application.block.css`

```css
[state|is-loading] {
  global: true;
  /* other styles can be here too but often this state is applied
directly to the html element. */
}

[state|is-saving] {
  global: true;
}
```

`navigation.block.css`
```css
@block-reference app from "application.block.css";

app[state|is-saving] .signout,
.signout[substate|disabled] {
  color: gray;
  pointer-events: none;
}
```

Block Inheritance
-----------------

To inherit from another block you must first define a reference to the
other block:

```css
@block-reference "./another-block.block.css";
```

By default the block can be referenced by it's natural name which would
be `another-block` in this case based on the filename. However you can
assign a local alias for the block:

```css
@block-refererence another from "./another-block.block.css";
```

And now that block can be referenced within this file by the name
`another`.

To inherit, you must set the property `extends` inside a `:block`
selector to the name of the block you wish to inherit.

```css
@block-refererence another from "./another-block.block.css";

:block {
  extends: another;
}
```

Note that block inheritance does not change the css output for a block.
instead, it changes exported identifiers associated with the block's
different objects. That is, the class(es) that are generated from
`another-block`'s `.foo` element are now assocated with this blocks
`.foo` element and all of the classes will be returned to the template.
Additionally, even if an object from the base class isn't mentioned in
the subclass, you can still set the classnames assocated with it as if
it had them.

Block Implementation
--------------------

In some cases it may be necessary for a block to conform to the API
of one or more blocks but that you want to provide a distinct
implementation of that interface. To accomplish this, you can declare
a block `implements` one or more blocks.

```css
@block-reference "./base.block.css";
@block-reference "./other.block.css";
:block { implements: base, other; color: red; }
```

Now if there are any states, classes or substates in those other blocks
that aren't mentioned in this block you will get an error:

```
Missing implementations for: :state(large), .foo:substate(small) from
./base.block.css
```

Note that this doesn't require a selector-level correspondance, merely
that the different types of states and classes have *some* styling.

Block composition
-----------------

When composing blocks, any property conflicts will result in a build
error unless a resolution is provided by one of the blocks:

```scss
@block-reference accordian from "../components/accordian.block";
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
composition of the necessary styles as it's own class.

File: `navigation.block.scss`

```scss
@block-reference "super-grid-system.block";
@block-reference "drop-down.block";
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

External Selectors
------------------

Sometime a class, identifier, or tagname comes from an external library or content comes from a
database and the only thing you can do is use them as is. For these
situations The block must declare the simple selectors that are
external to the block. These simple selectors can then be used as key
selectors that are scoped by state, class and substate as long as the
scoping selector would be valid otherwise.

```css
@external #my-ident, .some-rando-class, p, em, h1, h2;

.foo h2.some-rando-class {
  font-size: 32px;
}
```

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

Options
-------

* `outputMode`: type `cssBlocks.OutputMode`. Currently defaults to and
  must be `cssBlocks.OutputMode.BEM`. Other output modes will be
  defined soon.
* `interoperableCSS`: type `boolean`. When set to true, an `:exports`
  ruleset is generated providing local names that can be used from JS
  or in other CSS files that are [InteroperableCSS](https://github.com/css-modules/icss) compatible.
  The following names are exported:
  * `block` is exported with the name of the block.
  * State names: the name of the state. E.g. `[state|foo]` is exported
    as `foo`.
  * Exclusive State names: the name of the state group is prefixed to
    the state name with a dash. E.g. `[state|theme=red]` is exported as
    `theme-red`.
  * Class names: The name of the classes. E.g. `.foo` is exported as
    `foo`. Note that these can conflict with state names, it is left to
    the developer to avoid collisions if using interoperable CSS.
  * Class substates: The name of the class is prefixed to the state
    name separated by a double dash. E.g. `.foo[substate|visible]` is
    exported as `foo--visible`.

Output
------

There can be BEM compatibilty output option where the above example would
produce the following CSS output:

```css
.my-form { margin: 2em 0; padding: 1em 0.5em; }
.my-form--theme-red { color: #c00; }
.my-form--theme-blue { color: #006; }
.my-form--compact { margin: 0.5em 0; padding: 0.5em 0.5em; }
.my-form__input-area { display: flex; margin: 1em 0; font-size: 1.5rem; }
.my-form--compact .my-form__input-area { margin: 0.25em 0; }
.my-form__label { flex: 1fr; }
.my-form__input { flex: 3fr; }
.my-form--theme-red .my-form__input { border-color: #c00; }
.my-form--theme-blue .my-form__input { border-color: #006; }
.my-form__submit { width: 200px; }
.my-form__submit--disabled { color: gray; }
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
