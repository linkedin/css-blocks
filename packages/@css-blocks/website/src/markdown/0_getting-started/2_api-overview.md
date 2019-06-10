---
name: API Overview
title: CSS Blocks Features
---

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
