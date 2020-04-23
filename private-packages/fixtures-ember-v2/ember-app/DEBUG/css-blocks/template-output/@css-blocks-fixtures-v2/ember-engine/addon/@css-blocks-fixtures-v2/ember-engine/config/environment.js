var config;

try {
  var metaName = '@css-blocks-fixtures-v2/ember-engine/config/environment';
  var rawConfig = document.querySelector('meta[name="' + metaName + '"]').getAttribute('content');
  config = JSON.parse(unescape(rawConfig));
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '" due to error: ' + err);
}

export default config;
