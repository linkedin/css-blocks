import { postcss } from "opticss";

import { BLOCK_NAME, CLASS_NAME_IDENT } from "../../BlockSyntax";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

export async function discoverName(configuration: Configuration, root: postcss.Root, file: string, isDfnFile: boolean, defaultName?: string): Promise<string> {

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

  // We expect to have a block name by this point. Either we should have found one in the source
  // or inferred one from the filename. Definition files must include a blokc-name.
  if (!defaultName || defaultName.trim() === "") {
    if (isDfnFile) {
      throw new errors.InvalidBlockSyntax(`block-name is expected to be declared in definition file's :scope rule.\nIdentifier: ${file}`);
    } else {
      throw new errors.CssBlockError(`Unable to find or infer a block name.\nIdentifier: ${file}`);
    }
  }
  return defaultName;
}
