/* tslint:disable */
import { h } from 'preact';
import foo from '../blocks/foo.block.css';
import AwesomeTwo from './awesome-component-two';

export default function render(){
  return (<AwesomeTwo><div class={foo.pretty}></div></AwesomeTwo>);
}
