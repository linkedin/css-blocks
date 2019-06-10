import React from 'react';
import Markdown from '../../shared/Markdown';
import { Link } from 'react-router-dom'

import { PAGES } from './pages';
import MarkdownStyles from './markdown.css';
import LearnStyles from './Learn.block.css';

interface Params {
  sectionSlug: string;
  pageSlug: string;
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

function genNav(): JSX.Element[] {
  const out = [];
  let sectionIdx = 0;
  for (let section of PAGES.sections) {
    let pageIdx = 0;
    let pagesList = [];
    for (let page of section.pages) {
      try {
        let obj = require(`../../markdown/${sectionIdx}_${section.name}/${pageIdx}_${page.name}.md`) as MarkdownFile;
        pagesList.push((
          <li className={LearnStyles.navItem}>
            <Link
              to={`/learn/${section.name}/${page.name}`}
              className={LearnStyles.navLink}
            >{obj.attributes.name}</Link>
          </li>
        ));
      }
      catch(err) { console.error(err); }
      pageIdx++;
    }

    out.push((
      <li className={LearnStyles.navSection}>
        <h2>{section.name.replace('-', ' ')}</h2>
        <ul>{pagesList}</ul>
      </li>
    ))
    sectionIdx++;
  }
  return out;
}

interface MarkdownFile {
  attributes: any;
  // body: string;
  html: string;
}

export default function Learn({ match: { params: { sectionSlug = SECTION_DEFAULT, pageSlug = PAGE_DEFAULT }}}: Props) {
  let obj: MarkdownFile = {
    attributes: {
      title: "Oh No!",
    },
    html: "404 Not Found"
  };

  let sectionIdx = 0;
  console.log(sectionSlug, pageSlug)
  sectionLoop: for (let section of PAGES.sections) {
    if (section.name === sectionSlug) {
      let pageIdx = 0;
      for (let page of section.pages) {
        if (page.name === pageSlug) {
          try {
            obj = require(`../../markdown/${sectionIdx}_${sectionSlug}/${pageIdx}_${pageSlug}.md`) as MarkdownFile;
            break sectionLoop;
          } catch (err) { /* Remains a 404 page */ }
        }
        pageIdx++;
      }
    }
    sectionIdx++;
  }

  return (
    <div className={LearnStyles}>
      <link href={MarkdownStyles} rel="stylesheet" />
      <nav className={LearnStyles.nav}>
        <ul>
          { genNav() }
        </ul>
      </nav>
      <section className={LearnStyles.content}>
        <header>
          <h1 className={LearnStyles.title}>{obj.attributes.title}</h1>
        </header>
        <Markdown content={obj.html}></Markdown>
      </section>
    </div>
  );
};
