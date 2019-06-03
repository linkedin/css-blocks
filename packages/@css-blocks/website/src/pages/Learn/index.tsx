import React from 'react';
import Markdown from '../../shared/Markdown';
import { Link } from 'react-router-dom'

import LearnStyles from './Learn.block.css';

interface Params {
  section: string;
  page: string;
}

interface Match {
  params: Params;
}

interface Props {
  match: Match;
}

const SECTION_DEFAULT = "getting-started";
const PAGE_DEFAULT = "index";

// TODO: Automate discovery.
const pages = [
  ["getting-started", "index"],
  ["getting-started", "block-syntax"],
];

function genNav(): JSX.Element[] {
  const out = [];
  for (let [section, page] of pages) {
    try {
      let obj = require(`../../markdown/${section}/${page}.md`) as MarkdownFile;
      out.push((<li><Link to={`/learn/${section}/${page}`}>{obj.attributes.name}</Link></li>));
    }
    catch(err) {}
  }
  return out;
}

interface MarkdownFile {
  attributes: any;
  body: string;
  html: string;
}

export default function Learn({ match: { params: { section = SECTION_DEFAULT, page = PAGE_DEFAULT }}}: Props) {
  let html;
  try { let obj = require(`../../markdown/${section}/${page}.md`) as MarkdownFile; html = obj.html; }
  catch (err) { html = "404 Not Found"; }
  return (
    <div className={LearnStyles}>
      <nav className={LearnStyles.nav}>
        <ul>
          { genNav() }
        </ul>
      </nav>
      <section className={LearnStyles.content}>
        <Markdown content={html}></Markdown>
      </section>
    </div>
  );
};
