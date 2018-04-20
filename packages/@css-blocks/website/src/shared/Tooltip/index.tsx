import React, { Component } from 'react';

import styles from './Tooltip.block.css';

interface Props {
  label: string;
  value: string;
  x: number;
  y: number;
}

class Prism extends Component<Props> {

  render() {
    let { label, value, x, y } = this.props;
    return (
      <div
        className={styles}
        tabIndex={0}
        data-label={label}
        data-value={value}
        style={{ top: y+'rem', left: x+'rem' }}></div>
    );
  }

}

export default Prism;
