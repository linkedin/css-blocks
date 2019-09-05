import { postcss } from "opticss";

import { BLOCK_NAME, CLASS_NAME_IDENT } from "../../BlockSyntax";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

export async function discoverName(configuration: Configuration, root: postcss.Root, defaultName: string, file: string): Promise<string> {

  // Eagerly fetch custom `block-name` from the root block rule.
  root.walkRules(":scope", (rule) => {
    rule.walkDecls(BLOCK_NAME, (decl) => {
      if (!CLASS_NAME_IDENT.test(decl.value)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal block name. '${decl.value}' is not a legal CSS identifier.`,
          sourceRange(configuration, root, file, decl),
        );
      }

      defaultName = decl.value;

    });
  });

  return defaultName;
}
