---
name: Conflict Resolution
title: Conflict Resolution
---
## War! (What is it good for?)

Every Block you draft comes with a guarantee: the styles you write in that file will obey the CSS cascade.

However! When you begin to compose styles – either in-template or in-stylesheet – between two different Blocks, we run in to a problem – if the two styles define the same property, which style wins?! For example, suppose you have the following two Blocks:

```css
/* hoverable.css */
:scope {
  block-name: hoverable;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.2);
  transition: box-shadow .28s;
}
:scope:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2)
}
.button { 
  background-color: rgba(255, 255, 255, .5);
  color: black;
  transition: background-color .28s;
}
:scope:hover .button {
  background-color: rgba(255, 255, 255, 1);
}
```

```css
/* stylesheet.css */
@block other from "./hoverable.css";

:scope { block-name: main; }
.form {
  border: 1px solid gray;
  border-radius: 2px;
  padding: 16px;
}
.button { 
  background-color: green;
  color: white;
  height: 32px;
  width: 100%;
}
```

If we choose to compose these two Blocks together in-template like so, we *should* expect it to style all the elements appropriately:

```handlebars
{{!-- :scope selector from `stylesheet.css` is automagically applied to the template's wrapper element. Thanks Glimmer! --}}
<section>
  <form class="form other">
    <button class="button other.button">Click Me!</button>
  </form>
</section>
```

Above we have a simple template that contains a form with a single button that says "Click Me!". We style it with styles from the default Block for the template, `stylesheet.css`, and with styles from the referenced Block `hoverable.css`, referenced in this context as `other`.

In this template, we have the `<form>` element assigned the scoped root for `other`, and we apply the `button` class from both blocks to the `<button>` element.

But wait! If you try and run the CSS Blocks build with this code, you'd find an error in your console!

```bash
The following property conflicts must be resolved for these co-located Styles: (template.hbs:4:19)

          color:
            main.button (stylesheet.css:12:2)
            hoverable.button (hoverable.css:12:2)

          background-color:
            main.button (stylesheet.css:11:2)
            hoverable.button (hoverable.css:11:2)
```

Woah, what does this mean?! Well, if we stop and think for a second about what we just asked CSS Blocks to do, we'll realize that this error makes perfect sense.

Because Blocks have their own entirely independently scoped cascades, and right now no Block file is aware of any other Block's styles, CSS Blocks doesn't inherently know which Block should take priority over another when used together.

So, when CSS Blocks was asked to put the `.button` class from both the default template stylesheet, and from `hoverable` onto the same element, it noticed that both classes are claiming to set the `color` and `background-color` properties – and with this we have encountered our first **Indeterminate Cascade Resolution**. 

Which Block should win in this situation? Right now, the compiler has no idea. To answer that, CSS Blocks needs a little help from you. We are able to provide explicit cross-Block cascade resolutions to the compiler by using `resolve()`. Lets learn how we can fix our above error by moving on to the next section: **Block Resolutions**.

## Block Resolutions
The special `resolve()` function provides explicit resolution guidance for properties that are in conflict across two or more Block files. They look like any other property declaration:

```css
selector {
  property-name: resolve("<block-path>");
}
```

You will be asked by the CSS Blocks compiler to add resolutions if and when two styles are found on the same element in your templates that attempt to set the same CSS property.

Resolve declarations work just like progressive enhancement and graceful degradation! The last declaration defined in the ruleset will win. This means that declaration order matters. There are two ways to resolve any given property:

### Override Resolution
Override resolutions tell CSS Blocks that when these two styles  are used together, we want this Block to **override** the value of the other Style's property.

Here, we tell CSS Blocks to use the `color` value from `my-class` instead of `other.selector` when both styles are applied to the same element:

```css
.my-class {
  color: resolve("other.selector");
  color: red;
}
```

### Yield Resolution
Yield resolutions tell CSS Blocks that when these two styles  are used together, we want this Block to **yield** to the value of the other Style's property.

Here, we tell CSS Blocks to use the `color` value from `other.selector` instead of `my-selector` when both styles are applied to the same element:

```css
.my-class {
  color: red;
  color: resolve("other.selector");
}
```

> 🔮 **Future Feature: Resolve All Shorthand**
>
> For straightforward resolutions where you just want to yield or assume full control of styling against another block, feel free to use the CSS `all` property to quickly override or yield to all property conflict with another block. The downside of doing this is that as new properties are added to another element, you don't get a chance to review them and decide:

```css
.my-class {
  color: red;
  background: blue;

  /* Yields all conflicts to `other.selector` */
  all: resolve("other.selector");
}
```

> 💡 **Feature Note: Advanced Property Conflicts**
> 
> The CSS Blocks compiler is smart! If you have dynamic classes or states in your template, it will ask you to provide explicit resolutions between Blocks that even only have a *chance* of being used together on the same element. This way, we can guarantee that your styles will work regardless of the state your application may find itself it.
>
> Css Blocks is also aware of CSS shorthands and will ask you to resolve the lowest common denominator on conflicting shorthand/longhand expressions as well.

So, continuing with the example from the previous section –  **Composition in Templates** – we can satisfy the CSS Blocks compiler by adding in two explicit resolutions for `color` and `background-color` like so:

```css
/* stylesheet.css */
/* ... */

.button { 
  /* Override Resolution */
  background-color: resolve("hoverable.button");
  background-color: green;
  
  /* Override Resolution */
  color: resolve("hoverable.button");
  color: white;

  /* ... */
}
```

Here we have told CSS Blocks that when our component's `.button` class is used with hoverable's `.button` class, we want our component's style declarations to win! We have declared an **override resolution** for both properties.

If we were to switch around the order a bit so our `background-color` resolution comes *after* our component's declaration, it means that when these two classes are used together, hoverable's `.button` class will win, but only for that property. This is why you will never have to fight the cascade or use `!important` ever again!

```css
/* stylesheet.css */
/* ... */

.button { 
  /* Yield Resolution */
  background-color: green;
  background-color: resolve("hoverable.button");

  /* Override Resolution */
  color: resolve("hoverable.button");
  color: white;

  /* ... */
}
```

> 💡 **Feature Note: States and Pseudo-Classes**
>
> **States** and **Pseudo-Classes** inherit **all**  resolutions set on their containing **Class** or `:scope`.
>
> This means that in the above example, where we **yield** for `background-color`, and **override** for `color`, the button element where both classes are used will still use `hoverable.button:hover`'s `background-color`, but it's color will remain `white`, like our component styles define!

### Resolving Pseudo Elements
It is important to note that **Pseudo-Elements** do not inherit any resolutions from their container class and must be explicitly resolved in the source stylesheets when found to be in conflict.

So, for the following two Blocks where `my-class-1[state|enabled]` and `my-class-2` are used on the same element, one of the Blocks will need to resolve the conflicting `border-width` property:

```css
/* other */

.my-class-1[state|enabled]::before { 
  border: 1px solid red;
}
```

```css
/* main.css */

@block other from "./other.css";

.my-class-2::before { 
  border-width: 2px;
  border-width: resolve("other.my-class-2[state|enabled]");
}
```