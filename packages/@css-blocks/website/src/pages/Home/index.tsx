import React, { Component } from 'react';
import objstr from "obj-str";

import SplitButton from '../../shared/SplitButton/index';
import CodeDemo from './components/CodeDemo/index';

import logo from '../../images/wordmark-animated.svg';
import styles from './Home.block.css';
import test from './test.block.css';

import grid from '../../styles/grid.block.css';
import font from '../../styles/typography.block.css';
import button from '../../styles/button.block.css';

type DemoStates = 'code' | 'compile' | 'optimize';

interface State {
  active: DemoStates
}

class Home extends Component {

  state: State = {
    active: 'code'
  }

  switch(active: DemoStates){
    this.setState({active});
  }

  render() {

    return (
      <div className={styles}>
        <header className={styles.header}>
          <img src={logo} className={styles.logo} alt="logo" />
          <ul className={styles.features}>
            <li className={test}>💎 One CSS File Per Component</li>
            <li>📦 Scoped Styles</li>
            <li>🔎 Tiny Runtime (~500b)</li>
            <li>🔥 Blazing Fast Stylesheets</li>
            <li>🚀 Project-Wide Optimization</li>
            <li>🚨 Build Time CSS Errors</li>
            <li>🧟‍♂️ Dead Code Elimination</li>
            <li>✨ Object Oriented Inheritance</li>
          </ul>

          <div className={styles.buttonContainer}>
            <a
              href="https://github.com/linkedin/css-blocks#%EF%B8%8F-supported-integrations"
              target="_blank"
              className={button}
            >Get Started</a>
            <a
              href="/docs"
              target="_blank"
              className={objstr({ [button]: true, [button.color("purple")]: true})}
            >API Documentation</a>
          </div>

        </header>
        <div className={styles.main}>
          <section className={grid.container}>

            <h1 className={font.xlarge}>Blazing fast CSS for your <br />design systems and app components</h1>
            <p>Inspired by&nbsp;
              <a href="https://github.com/css-modules/css-modules" className={font.fancyLink} target="_blank">CSS Modules</a>,&nbsp;
              <a href="http://getbem.com/" className={font.fancyLink} target="_blank">BEM</a> and <a href="https://acss.io/" className={font.fancyLink} target="_blank">Atomic CSS</a>,&nbsp;
              CSS Blocks is the next evolution of best practices
            </p>

            <SplitButton data={[
              { title: '1. Code', callback: this.switch.bind(this, 'code') },
              { title: '2. Compile', callback: this.switch.bind(this, 'compile') },
              { title: '3. Optimize', callback: this.switch.bind(this, 'optimize') }
            ]}/>

            <CodeDemo page={this.state.active}/>
          </section>
        </div>
      </div>
    );
  }
}

export default Home;
