export default {
  name: 'helper:/css-blocks/components/block',
  func: function _blockHelper([test, name, klass]: any[]) {
    return klass ? ((test === name) ? klass : '') : test ? name : '' ;
  }
};
