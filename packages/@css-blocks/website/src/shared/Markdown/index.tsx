import React, { Component } from 'react';

// import './gruvbox-dark.css';
// import './markdown.css';

const wrapMarkup = (html: string) => ({
  __html: html,
});

interface Props {
  content: string;
}

class Markdown extends Component<Props> {
  private el: HTMLElement;

  render() {
    return (<div className="markdown" ref={this.save} dangerouslySetInnerHTML={wrapMarkup(this.props.content)} />)
  }

  // We do some classList hackery for Prism here.
  save = (el: HTMLElement) => {
    this.el = el;
    this.highlight();
  }

  componentDidUpdate(){
    this.highlight();
  }

  highlight() {
    if (!this.el) { return; }
    let els = this.el.querySelectorAll('[class^=language-]');
    // console.log(els);
    for (let el of els) {
      el.parentElement.classList.add('line-numbers');
      (window as any).Prism.highlightElement(el);
    }
  }
}

// const Markdown = ({ content }: Props) => (
//   <div className="markdown" dangerouslySetInnerHTML={wrapMarkup(content)} />
// );

export default Markdown;