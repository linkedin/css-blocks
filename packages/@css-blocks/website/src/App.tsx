import React, { Component } from 'react';
import GoogleAnalytics from 'react-ga';
import { BrowserRouter, Link, Route } from 'react-router-dom'

import Home from "./pages/Home/index";
import Demo from "./pages/Demo";
import Learn from "./pages/Learn/index";

import styles from "./App.block.css";
import linkedinLogo from "./images/linkedin-logo.svg";

GoogleAnalytics.initialize('UA-118435129-1');
GoogleAnalytics.pageview(window.location.pathname + window.location.search);

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
          <main className={styles.main}>
            <Route exact path="/" component={Home} />
            <Route exact path="/learn/:section/:page" component={Learn} />
            <Route exact path="/learn/:section" component={Learn} />
            <Route exact path="/learn" component={Learn} />
            <Route path="/demo" component={Demo} />
          </main>
          <footer className={styles.footer}>
            <a href="https://engineering.linkedin.com/open-source" className={styles.footerLink} target="_blank">
              {"Made with ♥ by "}
              <img src={linkedinLogo} className={styles.footerLogo}/>
            </a>
          </footer>
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
