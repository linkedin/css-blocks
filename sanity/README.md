# Sanity Check of Compressions Techniques

In order to understand the approximate savings of using the compression
techniques enabled by css-blocks, I wrote this script to verify how the
output might apply to real world css by assuming the styles encountered
were largely written as css blocks (without requiring them to be).

The goal here is to estimate the impact of converting a website to
css-blocks *without* actually converting it to decide if it is worth the
effort. This produces output that is a best case scenario. It's unlikely
that a full conversion will reach the level of compression produced by
this tool. By understanding how css blocks work and what this tool does,
it should allow you to make an educated guess about how close an
application's reality will match this estimate.

## Why it works

It has been well understood in the CSS community for some time now that
aggressive rewriting of selectors according to declarations is optimal
for performance for both over the wire and at runtime. However, because
of the importance of document order to the cascade resolution scheme
employed by CSS, agressive rewriting has remained an untenable automated
operation to do in the general case. Instead, a hand-optimized approach
called "atomic css" has become used by some developers -- it is the
general consensus that this reduces the overall maintainability of an
application. CSS Blocks introduce a new approach to style conflict
resolution that produces errors when a styles are composed by templates
and conflict without being *explicitly resolved*. This enables an
aggressive statically analyzable build-time optimization that has never
been previously employed (to my knowledge).

## How it works

Declarations (the key-value pairs in CSS) are extracted from a CSS file
and placed in optimization contexts based where they are found in the
existing CSS file. An optimization context is defined those aspects of a
CSS selector that must be shared by two selectors in order for their
declarations to be merged.

#### Aspects of an Optimization Context:

* Within an at-rule (E.g. `@media`, `@supports`) only declarations with
the same at-rule with the same value can be merged.
* Psuedoclasses and pseudoelements in a selector must be preserved and
so only declarations with the same pseudo selectors can be merged.
* Nesting context. In order to apply styles conditionally, css-blocks
allow block states to define a style dependency. This state cannot
be removed from the selectors and so only declarations with the same
nesting context can be merged.
* Importance. Declarations marked as `!important` can only be merged
with other declarations marked as `!important`. We don't expect
that important will be necessary for css-blocks because we provide a
much more robust resolution system than the cascade provides that
allows us to know which of several declarations an element eventually
uses.

#### Output:

* We generate 1 class per declaration per optimization context in this
experiment and reproduce selectors into their optimzation context in the
final output. Non-compressable css constructs (E.g. keyframe
declarations) are left in place.
* We nest selectors inside a shared selector context for BEM components
for that we use a generated classname instead of the original as this
more closely approximates the eventual output.
* We remove vendor prefixing for processing and then add vendor
prefixing back in at the end.
* Selectors and declarations with `!important` are left in place even
thought in theory the can be merged with other declarations that are
also marked the same.

## Results:

I took the CSS of linkedin.com as a single file and ran it through
this sanity-check optimizer.

```
┌────────────┬──────────────┬───────────┬───────────┐
│            │ Uncompressed │ Gzip      │ Brotli    │
├────────────┼──────────────┼───────────┼───────────┤
│ Original   │ 1.55 MB      │ 174.78 kB │ 124.51 kB │
├────────────┼──────────────┼───────────┼───────────┤
│ Processed  │ 217.28 kB    │ 47.64 kB  │ 36.79 kB  │
├────────────┼──────────────┼───────────┼───────────┤
│ Difference │ 1.33 MB      │ 127.14 kB │ 87.72 kB  │
├────────────┼──────────────┼───────────┼───────────┤
│ Percent    │ 14.04%       │ 27.26%    │ 29.55%    │
└────────────┴──────────────┴───────────┴───────────┘
```

We saw an 85% reduction of uncompressed CSS output and a 70% reduction
of brotli compressed files. I suspect that a full conversion of
LinkedIn.com's website to this approach may net 75% and 60% corr

## Learnings:

* Compression algorithms are good at removing duplication but our
content-aware compression system employed here allows for vastly smaller
output and by reducing the number of selectors and keeping them very
simple we should see a corresponding improvement to runtime performance
in keeping with the results we see when projects initially adopt BEM
over highly-specific contextual selectors.
* We generate class names in this project and we found that the
generated class names have a big impact on the effectiveness of
compression algorithms. Perhaps not surprisingly, class name generation
based on incrementing a counter and transforming to base 36 appears to
be the biggest win for binary compression. However, a content-based hashing for
class names has benefits for deduplication across multiple css files but
doesn't compress nearly as well. I suspect that a hybrid approach where we 
use content hash classes at first for easy analysis and then a final
pass where we transform our classes to ones using a counter will
ultimately result in smallest sizes and optimized for delivery across
multiple bundles.
* Splitting css shorthand properties into their corresponding longhand
properties (E.g. turning `border: 1px 2px 3px 4px` into `border-top:
1px; border-right: 2px; border-bottom: 3px; border-left: 4px;` can
deliver a net win in some situations but doesn't appear to be a net win
on average across real-world-sized optimization contexts. A smart
optimizer should be able to detect optomization contexts where it helps
more than it hurts and perform it accordingly.

## Things we're not able to test in this sanity check

* When we have CSS blocks working as intended with template
  metadata we will know definitively which block styles are used together
  and so this will actually let us merge selectors with declarations that
  are always shared. This is an optimization of our optimzation but it
  should result in non-trivial savings for small optimizations contexts.
  In some cases it will simply result in re-assembling the original
  rulesets in other cases it will result in finding shared "Base"
  selectors.

Concerns:

* This technique results in multiple CSS classes replacing a single CSS
  class in a template. This may cause template sizes to grow compared to
  current BEM class naming approaches. It's possible that compression from
  gzip or brotli may mitigate this or even result in a net decrease but
  this experiment did not analyze the net effect on templates. I suspect
  that the templates will see similar compression results for class names
  using counters but will not see *as big* of a benefit because of how the
  classnames will be distributed differently within templates.
* We don't know how big of an impact this will have to build times. It's
  possible this can be mitigated by introducing optimization levels that
  allow lower-cost optimizations to be used for development and
  higher-cost optimizations to be done for testing and in production.
* Debugging costs will increase. We will need to create tools that
  enable developers to understand why a particular class got applied to
  their element. I do not think debug analysis can be sprinkled in later
  -- we need to build it as we go. It should be noted that this is a
   situation where sourcemaps *don't work*. Source maps are good for
  debugging 1-1 and 1-n translations of source input but are lossy when
  debugging the kind of n-1 translations that we're performing here.
* It's not uncommon for developers to deviate from BEM best practices.
  CSS Blocks will make this harder to do and in some cases may make
  existing styling approaches not possible at all. Hopefully the
  benefits of css blocks will make it worth the effort to fully decouple
  and convert existing styles.
