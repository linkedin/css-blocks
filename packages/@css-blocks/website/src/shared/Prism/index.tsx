import React, { Component } from 'react';

import containerStyle from './Prism.block.css';

interface Props {
  language: string;
}

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
    this.el.classList.add('language-' + this.el.dataset.language);
    this.el.parentElement.classList.add('line-numbers');
    (window as any).Prism.highlightElement(this.el);
  }
}

export default Prism;
