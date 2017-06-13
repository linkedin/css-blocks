# CSS Blocks JSX Analyzer

// TODO: Write README

NOTE: To run locally, this module currently requires the latest version of `css-blocks/css-blocks` and `epicmiller/babylon` checked out locally, built, and `npm link`ed with this project.

## API Straw Man

### Version 1
```css
{! bar.block.css }

{! .bar }
.root {
  display: none;
  background-color: red;
}

{! .bar--open }
[state|open] {
  display: block;
}

{! .bar__pretty }
.pretty {
  border: 1px solid red;
}

{! .bar__pretty.bar__pretty--color-pink }
.pretty[state|color=pink] {
  background-color: pink;
}

{! .bar__pretty.bar__pretty--color-blue }
.pretty[state|color=blue] {
  background-color: blue;
}

```

```javascript

import bar from "bar.block.css";

function render() {

  let style = objstr({
    [bar]: expr,
    'my-active-class': state.isActive
  });

  return (
    <div class={style} bar:open={state.open}>
      <div class={bar.pretty} bar.pretty:color={state.color}></div>
    </div>
  );
}

```
Transforms to:

```javascript

function render() {

  let s1 = state.open;
  let c1 = objstr({
    'my-active-class': state.isActive,
    [objstr({
      'bar': true,
      'bar--open': state.open,
    })]: expr
  });
  let o1 = {
    bar: {
      open: true
    }
  };

  let s2 = state.color;
  let c2 = objstr({
    [objstr({
      'bar__pretty': true,
      'bar__pretty--color-blue': s2 === 'blue',
      'bar__pretty--color-pink': s2 === 'pink'
    })]: true
  });
  let o2 = {
    bar: {
      pretty: {
        color: s2
      }
    }
  };

  return (
    <div class={c1} block={o1}>
      <div class={c2} block={o2}></div>
    </div>
  );
}

```

### Version 2

```javascript
import * as style from 'css-blocks-api';
import grid, {
  states as gridStates,
  classes as gridClasses
} from 'styles/grid.block.css';
import * as nav from 'ui/navigation/navigation.block.css';

// ...

const activeTabClass = objstr({
  [nav]: true,
  [gridClasses.foo]: true,
  [gridClasses.bar]: true,
  [gridStates.color.blue]: this.color === 'blue',
  [gridStates.color.red]: this.color === 'red',

  nav: {
    'navigation-item': true,
    'state:active': true,
    'state:mode': style.select({
      open: isOpen(),
      minimized: isMinimized(),
      closed: true,
    }),
  },
});

return (
  <nav class="nav.root">
    <a href="/feed" class="nav.logo">
      <icons.Logo />
    </a>
    <ul role="navigation" class="nav.list">
      <li class="nav.list-item">
        <a href="/feed" class={activeTabClass}>
          <icons.Feed style={navIcon} />
          <span>Home</span>
        </a>
      </li>
      <li class="nav.list-item">
        <BuddyLink to="/mynetwork/" class={style("nav.navigation-item")}>
          <icons.MyNetwork style="navIcon" />
          <span>My Network</span>
        </BuddyLink>
      </li>
  </nav>
);

// ...

```
