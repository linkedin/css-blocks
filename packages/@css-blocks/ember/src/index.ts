import { AddonImplementation } from "ember-cli/lib/models/addon";

interface CSSBlocksAddon {
}

const EMBER_ADDON: AddonImplementation<CSSBlocksAddon> = {
  name: "@css-blocks/ember",
  init(parent, project) {
    return this._super.init && this._super.init.call(this, parent, project);
  },
  included(parent) {
    this._super.included.apply(this, [parent]);
  },
  compileTemplates(addonTree) {
    return this._super.compileTemplates.call(this, addonTree);
  }
};

module.exports = EMBER_ADDON;
