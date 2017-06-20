/* tslint:disable */
import { h } from 'preact';
import foo from '../blocks/foo.block.css';

export default function render(){
  return (<div class={foo.pretty}></div>);
}
