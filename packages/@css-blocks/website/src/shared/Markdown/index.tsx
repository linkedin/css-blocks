import React from 'react';

// import './gruvbox-dark.css';
// import './markdown.css';

const wrapMarkup = (html: string) => ({
  __html: html,
});

interface Props {
  content: string;
}

const Markdown = ({ content }: Props) => (
  <div className="markdown" dangerouslySetInnerHTML={wrapMarkup(content)} />
);

export default Markdown;