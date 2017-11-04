import { default as classnames  } from './classnames';
import { default as concat } from './concat';

export {
  classnames as classnames,
  concat as concat
};

export default {
  [classnames.name]: classnames.func,
  [concat.name]: concat.func,
};
