---
name: Block Paths
title: Referencing Imported Styles
---

Now that you know how to [import and export](/learn/block-files/import-export) other Block files, we need to know one more thing before using the styles defined therein: how to reference styles on imported Blocks.

You do this using a small query syntax called a [Block Path](./packages/css-blocks/src/BlockSyntax/BlockPath.ts).

Block Paths take the form: 

```bash
block.class[state|name="value"]
```

All sections of this selector – except the leading Block name – are optional. The leading Block name *must* refer to an `@block` import. If CSS Blocks is unable to resolve a Block Path at build time, you will get a friendly error message in your console!

All the following syntaxes are legal to select any given stylable on a referenced Block:

|Stylable|Syntax|
|:--|:--|
|Scope|`block`|
|Scope State|<code>block[state&#124;name]</code>|
|Scope Sub-State|<code>block[state&#124;name="value"]</code>|
|Class|`block.class`|
|Class State|<code>block.class[state&#124;name]</code>|
|Class Sub-State|<code>block.class[state&#124;name="value"]</code>|

> 🔮 **Future Feature: Block Path Wildcards**
> 
> In some situations, you may want to select multiple classes, states or sub-states on a referenced block. In the near future you will be able to do so with a wildcard syntax: `block.*`, `block.class[state|*]`, `block.class[state|name=*]`. Feel free to track progress of this feature [here]()
