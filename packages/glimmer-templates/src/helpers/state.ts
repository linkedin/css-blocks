export default {
  name: 'helper:/css-blocks/components/state',
  func: function _stateHelper([test, name, klass]: any[]) {
    return klass ? ((test === name) ? klass : '') : test ? name : '' ;
  }
};
