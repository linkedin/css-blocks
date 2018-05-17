import { expect } from "chai";
import Analyzer from "glimmer-analyzer";

import { fixture } from "./fixtures";

describe("Recursive template dependency analysis", function() {
  it("discovers recursive dependencies", function() {
    let analyzer = new Analyzer(fixture("basic-app"));
    let analysis = analyzer.recursiveDependenciesForTemplate("my-app");

    expect(analysis).to.deep.equal({
      path: "/basic-app/components/my-app",
      hasComponentHelper: false,
      helpers: [],
      components: [
        "/basic-app/components/my-app/page-banner",
        "/basic-app/components/text-editor",
        "/basic-app/components/my-app/page-banner/user-avatar",
        "/basic-app/components/ferret-launcher",
      ],
    });
  });

  it("can generate a filtered resolution map", function() {
    let analyzer = new Analyzer(fixture("basic-app"));
    let map = analyzer.resolutionMapForEntryPoint("my-app");

    expect(map).to.deep.equal({
      "component:/basic-app/components/my-app": "src/ui/components/my-app/component",
      "template:/basic-app/components/my-app": "src/ui/components/my-app/template",
      "component:/basic-app/components/my-app/page-banner": "src/ui/components/my-app/page-banner/component",
      "template:/basic-app/components/my-app/page-banner": "src/ui/components/my-app/page-banner/template",
      "template:/basic-app/components/ferret-launcher": "src/ui/components/ferret-launcher/template",
      "template:/basic-app/components/my-app/page-banner/user-avatar": "src/ui/components/my-app/page-banner/user-avatar/template",
      "template:/basic-app/components/text-editor": "src/ui/components/text-editor/template",
      "component:/basic-app/components/text-editor": "src/ui/components/text-editor/component",
    });
  });
});
