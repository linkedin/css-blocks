import React, { Component } from 'react';

import containerStyle from './Prism.block.css';

interface Props {
  language: string;
}

const pastLanguages: Set<string> = new Set();

class Prism extends Component<Props> {

  private el: HTMLElement;

  render() {
    return (
      <pre className={containerStyle}>
        <code data-language={this.props.language} ref={this.save}>{this.props.children}</code>
      </pre>
    );
  }

  componentDidUpdate(){
    this.highlight();
  }

  // We do some classList hackery for Prism here.
  save = (el: HTMLElement) => {
    this.el = el;
    this.highlight();
  }

  highlight(){
    if (!this.el) { return; }
    for (let lang of pastLanguages){ this.el.classList.remove(lang); }
    let lang = 'language-' + this.el.dataset.language;
    pastLanguages.add(lang);
    this.el.classList.add('language-' + this.el.dataset.language);
    this.el.parentElement.classList.add('line-numbers');
    (window as any).Prism.highlightElement(this.el);
  }
}

export default Prism;
