import React, { Component } from 'react';

import Prism from '../../../../shared/Prism/index';
import Tooltip from '../../../../shared/Tooltip/index';

import styles from './CodeDemo.block.css';
import demos, { Data, Sections} from './demos/index';

interface Props {
  page: Sections
}

class CodeDemo extends Component<Props> {
  render() {
    let page = this.props.page;
    return (
      <div className={styles}>
        <div className={styles.editor}>
          {(demos[page] as Data).cssTooltips.map((d) => { return <Tooltip {...d} />; } )}
          <Prism language="css">{demos[page].cssExample}</Prism>
        </div>
        <div className={styles.editor}>
          {(demos[page] as Data).jsxTooltips.map((d) => { return <Tooltip {...d} />; })}
          <Prism language="jsx">{demos[page].jsxExample}</Prism>
        </div>
      </div>
    );
  }
}

export default CodeDemo;
