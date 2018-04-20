import React, { Component } from 'react';
import objstr from 'obj-str';

import styles from './SplitButton.block.css';

interface Button {
  title: string;
  callback: () => {}
}

interface Props {
  data: Button[];
}

interface State {
  active: number;
}

class SplitButton extends Component<Props, State> {

  state: State = {
    active: 0
  }

  select(idx: number, callback?: () => {}) {
    this.setState({ active: idx });
    callback && callback();
  }

  render() {

    let buttons: JSX.Element[] = []
    this.props.data.forEach((el, idx) => {

      let style = objstr({
        [styles.button]: true,
        [styles.button.active()]: this.state.active === idx
      });

      buttons.push(
        <button
          key={idx}
          className={style}
          onClick={this.select.bind(this, idx, el.callback)}
        >{el.title}</button>
      );
    });
    return (
      <div className={styles}>
        {buttons}
      </div>
    );
  }
}

export default SplitButton;
