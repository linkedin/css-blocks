/* tslint:disable */
import { h } from 'preact';
import baz from '../blocks/baz.block.css';

export interface Props {
  children?: any
}

export default function render(props: Props){
  return (<div class={baz.pretty}>{props.children}</div>);
}
