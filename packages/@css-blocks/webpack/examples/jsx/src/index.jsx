import React from 'react';
import ReactDOM from 'react-dom';
import Button from './Button';

import styles from './index.block.css';

ReactDOM.render(
  <div className={styles}>Hello CSS Blocks! <Button /></div>,
  document.getElementById('app')
);
