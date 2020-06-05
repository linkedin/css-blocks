import { postcss } from "opticss";

import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

export async function disallowDefinitionRules(block: Block, configuration: Configuration, root: postcss.Root, file: string): Promise<postcss.Root> {
  root.walkRules((rule) => {
    rule.walkDecls((decl) => {
      if (decl.prop === "block-id") {
        block.addError(
          new errors.InvalidBlockSyntax(
            `block-id is disallowed in source block files.`,
            sourceRange(configuration, root, file, decl),
          ),
        );
      } else if (decl.prop === "block-class") {
        block.addError(
          new errors.InvalidBlockSyntax(
            `block-id is disallowed in source block files.`,
            sourceRange(configuration, root, file, decl),
          ),
        );
      }
    });
  });

  return root;
}
