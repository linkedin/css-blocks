# CSS Blocks JSX Analyzer

// TODO: Write README

## API Straw Man

```javascript
import * as style from 'css-blocks-api';
import * as grid from 'styles/grid.block.css';
import * as nav from 'ui/navigation/navigation.block.css';

// ...

const activeTabClass = style({
  grid: 'span-3 state:gutter=both',
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
