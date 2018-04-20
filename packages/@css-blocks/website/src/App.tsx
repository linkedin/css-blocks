import React, { Component } from 'react';
import { BrowserRouter, Link, Route } from 'react-router-dom'

import Home from "./pages/Home/index";
import Demo from "./pages/Demo";

import styles from "./App.block.css";

class App extends Component {
  render() {
    return (
      <BrowserRouter>
        <div className={styles}>
          <nav className={styles.nav}>
            <ul className={styles.navList}>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/demo">Demo</Link></li>
            </ul>
          </nav>
          <main>
            <Route exact path="/" component={Home} />
            <Route path="/demo" component={Demo} />
          </main>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
