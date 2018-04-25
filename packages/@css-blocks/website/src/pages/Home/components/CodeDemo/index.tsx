import React, { Component } from 'react';
import objstr from 'obj-str';

import Prism from '../../../../shared/Prism/index';
import Tooltip from '../../../../shared/Tooltip/index';
import typography from '../../../../styles/typography.block.css';
import styles from './CodeDemo.block.css';
import demos, { Sections} from './demos/index';

export interface Props {
  page: Sections
}

export interface State {
  syntax: string
}

class CodeDemo extends Component<Props, State> {
  state: State = { syntax: "jsx" };
  render() {
    let page = this.props.page;
    let editorTitle = objstr({
      [styles.editorTitle]: true,
      [typography.sans]: true,
    });
    let editorSelect = objstr({
      [styles.editorSelect]: true,
      [typography.sans]: true,
    });
    return (
      <div className={styles}>
        <div className={styles.editor}>
          <h3 className={editorTitle}>
            {this.state.syntax === "jsx" ? "button.block.css" : "stylesheet.css"}
          </h3>
          {demos[page].cssTooltips.map((d) => { return <Tooltip {...d} />; } )}
          <Prism language="css">{demos[page].cssExample}</Prism>
        </div>
        <div className={styles.editor}>
          <h3 className={editorTitle}>
            <select className={editorSelect} onChange={this.languageChange}>
              <option value="jsx">template.jsx</option>
              <option value="glimmer">template.hbs</option>
            </select>
          </h3>
          {this.renderTemplate(page, this.state.syntax)}
        </div>
      </div>
    );
  }

  renderTemplate(page: string, type: string): JSX.Element {
    console.log(page, type);
    if (type === "glimmer") {
      return (
        <div>
          { demos[page].glimmerTooltips.map((d) => { return <Tooltip {...d} />; }) }
          <Prism language="handlebars">{demos[page].glimmerExample}</Prism>
        </div>
      );
    }
    return (
      <div>
        { demos[page].jsxTooltips.map((d) => { return <Tooltip {...d} />; }) }
        <Prism language="jsx">{demos[page].jsxExample}</Prism>
      </div>
    );
  }

  languageChange = (e: any) => {
    let option: string = e.target.value;
    this.setState({'syntax': option});
  }
}

export default CodeDemo;
