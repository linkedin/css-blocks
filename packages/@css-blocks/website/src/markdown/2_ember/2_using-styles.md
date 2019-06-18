---
name: Using Styles
title: Using Styles
---

When a Block file has been discovered for a template in your project, all of its styles and exported Blocks will be available for you to use. You can use the Block's `.class` and `[state]` selectors in your template as if you are using regular CSS. For example, consider:

```css
/* /styles/application.block.css */
:scope {
  background: gray;
}

.container {
  background-color: white;
  display: none;
}

.container[state|visible] {
  display: block;
}

.container[state|color="red"] {
  background-color: red;
}
```

```handlebars
{{!-- /templates/application.hbs --}}
<main> {{!-- :scope is automagically applied to the root element --}}
  <section class="container" state:visible>Welcoe to my App!</section>
  <section class="container">I'm hidden!</section>
  <section class="container" state:visible state:color="red">
    What a dramatic red box!
  </section>
</main>
```

There are just two (2) rules to keep in mind when styling a CSS Blocks template:

### 1. The `.class` or `[state]` has to exist

Pretty straightforward! If you want to use it, the style has to exist. If you use a style that does not exist, you will receive a friendly build error.

```css
:scope { color: red; }
```
```handlebars
<main>
  <section class="non-existent">Uh Oh</section>
</main>
```
```bash
$ Error: Can not find class 'non-existent'.
```
### 2. One Class, Per Element, Per Block

If you attempt to apply more than one class, from the same Block, to an element, you will receive a build time error.

```css
.class-one { color: red; }
.class-two { color: blue; }
```
```handlebars
<main>
  <section class="class-one class-two">Uh Oh</section>
</main>
```
```bash
$ Error: Can not apply two classes from the same Block.
```