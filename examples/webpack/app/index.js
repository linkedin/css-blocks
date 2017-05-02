import helloCSS from "./styles/hello.css";
import californiaCSS from "./styles/california.css";

import { iCssAdapter as cssBlockAdapter } from "css-blocks";
let helloStyles = cssBlockAdapter(helloCSS);
let californiaStyles = cssBlockAdapter(californiaCSS);



function hello(name, styles) {
  var element = document.createElement('div');
  element.className = styles(":block");
  element.innerHTML = "Hello, ";

  var world = document.createElement('span');
  world.innerHTML = name;
  world.className = styles(":state(greeting-target)");
  element.appendChild(world);

  return element;
}

document.body.appendChild(hello("World", helloStyles));
document.body.appendChild(hello("California", californiaStyles));
