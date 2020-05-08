import { postcss } from "opticss";

import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

export async function disallowDefinitionRules(configuration: Configuration, root: postcss.Root, file: string): Promise<postcss.Root> {
  root.walkRules((rule) => {
    rule.walkDecls((decl) => {
      if (decl.prop === "block-id") {
        throw new errors.InvalidBlockSyntax(
          `block-id is disallowed in source block files.`,
          sourceRange(configuration, root, file, decl),
        );
      } else if (decl.prop === "block-class") {
        throw new errors.InvalidBlockSyntax(
          `block-id is disallowed in source block files.`,
          sourceRange(configuration, root, file, decl),
        );
      }
    });
  });

  return root;
}
