import { default as block  } from './style-if';
import { default as state } from './state';
import { default as concat } from './concat';

export {
  block as block,
  state as state,
  concat as concat
};

export default {
  [block.name]: block.func,
  [state.name]: state.func,
  [concat.name]: concat.func,
};
