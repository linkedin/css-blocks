export default {
  name: 'helper:/css-blocks/components/style-if',
  func: function _styleIfHelper([test, isIf, klass1, klass2='']: any[]) {
    return isIf ? (test ? klass1 : klass2 ) : (test ? klass1 : klass2);
  }
};
