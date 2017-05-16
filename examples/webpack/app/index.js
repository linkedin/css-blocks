import helloCSS from "./styles/hello.css";
import californiaCSS from "./styles/california.css";
import outlinesCSS from "./styles/outlines.css";

import { iCssAdapter as cssBlockAdapter, union as stylesUnion } from "css-blocks";
let helloStyles = cssBlockAdapter(helloCSS);
let californiaStyles = cssBlockAdapter(californiaCSS);
let outlinesStyles = cssBlockAdapter(outlinesCSS);



function hello(name, styles) {
  var element = document.createElement('div');
  element.className = styles.block(".root");
  element.innerHTML = "Hello, ";

  var world = document.createElement('span');
  world.innerHTML = name;
  world.className = stylesUnion(styles.block(".greeting-target"), styles.outlines(".outlined"));
  element.appendChild(world);

  return element;
}

document.body.appendChild(hello("World", {block: helloStyles, outlines: outlinesStyles}));
document.body.appendChild(hello("California", {block: californiaStyles, outlines: outlinesStyles}));
