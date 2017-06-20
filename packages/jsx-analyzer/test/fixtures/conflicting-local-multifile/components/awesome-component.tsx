/* tslint:disable */
import { h } from 'preact';
import bar from '../blocks/foo.block.css';

export default function render(){
  return (<div class={bar.pretty}></div>);
}
