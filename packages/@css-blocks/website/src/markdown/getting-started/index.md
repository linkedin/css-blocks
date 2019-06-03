---
name: What is CSS Blocks?
---
# Why CSS Blocks?
With css-blocks added to your project, you receive:

 - 💎 One CSS File Per Component
 - 📦 Scoped Styles
 - 🔎 Nearly Non-Existent Runtime (~500b)
 - 🔥 Blazing Fast Stylesheets
 - 🚀 Project-Wide Optimization
 - 🚨 Build Time CSS Errors
 - 🧟 Dead Code Elimination
 - ✨ Object Oriented Inheritance

But, most importantly, CSS Blocks is **⚡️Statically Analyzable**.

## The ⚡️ of Static Analysis
Static analysis means css-blocks can look at your project and know with *certainty* that any given CSS declaration will, will not, or might under certain conditions, be used on any given element in your templates. 

Most stylesheet architectures have to walk a fine line between performance and
maintainability. Tilt too far in either direction and either your users or the developers
will end up paying the cost. With CSS Blocks, you can focus on making sure your
stylesheets are easy to maintain as your application changes, and with the new
CSS optimizer, [OptiCSS](https://github.com/linkedin/opticss), the small size of your
app's production stylesheets after compression will amaze you.

Gone are the days where you spend several minutes debugging your app only to discover a subtle typo that caused a selector to not match – CSS Blocks will give you a build error and suggest possible fixes. With IDE integration, projects using CSS Blocks will be able to quickly navigate to selector definitions that match your current template element and find which template elements match your current selector, autocomplete class names. With CSS Blocks new resolution system, cascade conflicts will be caught for you before you even know they exist and you will never have to fight a specificity war ever again.

<!-- ![CSS Blocks Example](https://user-images.githubusercontent.com/7856443/39090683-78ca1966-459a-11e8-8128-f50a9b2a1810.jpg) -->

> CSS Blocks is inspired by [CSS Modules](https://github.com/css-modules/css-modules), [BEM](http://getbem.com/) and [Atomic CSS](https://acss.io/)
> 
> For a full deep-dive of the project architecture, I heavily recommend you review the [CSS Blocks Architecture README](./ARCHITECTURE.md)!


# 🎁 API Features

CSS Blocks is under active development and there are a number of features that have not yet been implemented! You can get a snapshot of the feature-set state here.

> ✅ = Implemented  |  ❌ = Not Implemented  |  💀 = Deprecated  |  🖌 = In Proposal  |

|**Status**| **Feature** | **Description** |
|:--:|:--|:--|
| **Selectors** ||
| ✅ | `:scope` | Scope selector for component root. |
| ✅ | `.class` | Class selectors for component sub-elements. |
| ✅ | <code>.class[state&#124;name]</code> | State that is applied to scope and class selectors on state existence. |
| ✅ | <code>.class[state&#124;name="value"]</code> | Mutually exclusive sub-states for scope and class selectors to be applied when a sub-state value matches. |
| ❌ | <code>[state&#124;name=value]</code> | Bare state (not associated with an Originating Element) and optional substate selectors for targeting all elements in the Block that possess the state an/or sub-state. |
| 🖌 | <code>.class[state&#124;name default]</code> | Default state value to be applied when there is no other match. |
| **At Rules** ||
| ✅ | `@block local-name from "./file/path.css"` | Reference another Block using a local name. |
| ✅ | `@block-debug block-name to channel` | Debug call that will print a block interface to a "channel": `comment`, `stderr`, or `stdout`. |
| ✅ | `@block-global block.path` | Declare a Block class or state as public. It may be used as a context selector in other Blocks. |
| 🖌 | `@is-block block-name` | Block class can declare itself to be the root of another block in a specific state or set of states.  |
| **Properties** ||
| ✅ | `block-name: "custom-name";` | Provide custom Block names in `:scope` for a nicer debugging experience. |
| ✅ | `implements: block-name;` | A Block can declare that it implements one or more other Block's interfaces in its `:scope` selector and the compiler will ensure that all of those states and classes are styled locally. |
| ✅ | `extends: block-name;` | A Block may specify it extends another Block in its `:scope` selector to inherit and extend all the class and state implementations therein. |
| ✅ | `composes: "block.path";` | Mixin-Style class and state composition. Apply other Blocks' Styles to one of yours.  |
| **Functions** ||
| ✅ | `resolve("block.path");` | Provide an explicit resolution for a given property against another Block. |
| ❌ | `constrain(val1, val2 ... valN);` | Constrain this property to a list of specific values that may be set when this Block is extended. |
| ❌ | `range(min, max);` | Constrain this property to a range of values that may be set when this Block is extended.  |
