import _ from 'lodash';
import helloCSS from "./styles/hello.css";
import californiaCSS from "./styles/california.css";



function hello(name, styles) {
  console.log(styles);
  var element = document.createElement('div');
  element.className = styles.block;
  element.innerHTML = "Hello, ";

  var world = document.createElement('span');
  world.innerHTML = "World";
  world.className = styles["greeting-target"];
  element.appendChild(world);

  return element;
}

document.body.appendChild(hello("World", helloCSS));
document.body.appendChild(hello("California", californiaCSS));
