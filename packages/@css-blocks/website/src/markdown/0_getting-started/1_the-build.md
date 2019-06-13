---
name: The CSS Blocks Build
title: Build Phases
---

The CSS Blocks build operates in three phases:

1. **Analyze** all of your application's CSS Blocks stylesheets, and templates;
2. **Compute** the optimized stylesheet to output for your application, with instruction for how to rewrite templates to use the new styles;
3. **Rewrite** the world. Modify templates to use the new class names, and inject the optimized CSS output into the page.

Because CSS Blocks requires information from both your stylesheets *and* your application templates to rewrite your app, you may be thinking that CSS Blocks requires a pretty deep integration with your application's templating system...

You'd be right!

To analyze your styles CSS, Blocks will use the same analyzing and rewriting system regardless of your application framework. However, in order to analyze and rewrite your templates, CSS Blocks needs to use a specific package tailored for the templating language.

Every template integration will have its own slightly unique syntax for how to interface with a Block file. However, they all will allow you to apply classes and states in a way that can be statically analyzed and re-written at build time.

> 💡 **Feature Note: Template Integrations**
> 
> Each integration implements a slightly different API. Ex: JSX lets you `import` Block files, whereas the Ember integration looks for, through filesystem convention, a default stylesheet corresponding to every component template.

However, whatever the template implementation happens to be, it should feel as though you're interfacing with regular CSS on the platform. For example, in Ember you simply write the classes and states exactly as you would expect to when working with a typical stylesheet:

```css
:scope                { /* ... */ }
:scope[state|enabled] { /* ... */ }
.button               { /* ... */ }
.icon                 { /* ... */ }
.icon[state|inverse]  { /* ... */ }
```

```handlebars
{{!--
  Our `:scope` is automagically applied to the template's root element.
  Yay! Conventions!
--}}
<section state:enabled={{isEnabled}}>
  <button class="button">
    <div class="icon" state:inverse={{isInverse}}></div>
    {{value}}
  </button>
</section>
```

This doesn't mean there aren't a few rules though. Regardless of the templating system you use, there are only two (2) common-sense rules to follow when using Block styles in your template:

 1. You **may not** use a Block class outside of it's `:scope`'s subtree.
 2. Two classes *from the same Block* **may not** be applied to the same HTML element.

## ⚙️ Supported Template Integrations

CSS Blocks is available for use in the following templating languages:

 - [JSX / React][JSX]
 - [Glimmer][GLIMMER]

## The Build System

With Template integrations, CSS Blocks is able to read, analyze, and rewrite individual template files. However, this is useless unless CSS Blocks can hook in to your chosen build system, intercept templates and stylesheets at the right point in your build for analysis, and rewrite all of them at the end. To support this, CSS Blocks has a number of build integrations. These build integrations will be passed your chosen template analyzer to call as it encounters templates in your application.

 - [Webpack][WEBPACK]
 - [Broccoli][BROCCOLI]
 - [Ember-CLI][EMBER_CLI]

> Don't see your preferred templating or build library yet?
>
> Learn how to make your own [Template Integration](./ARCHITECTURE.md#template-integrations) or [Build System Integration](./ARCHITECTURE.md#build-system-integrations) and contribute it back!

To learn how to install CSS Blocks for in your application, please consult the specific docs for your templating system and build system.
