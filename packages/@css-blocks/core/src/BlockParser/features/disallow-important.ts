import { postcss } from "opticss";

import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";

export async function disallowImportant(root: postcss.Root, file: string): Promise<postcss.Root> {
  root.walkDecls((decl) => {

    // `!important` is not allowed in Blocks. If contains `!important` declaration, throw.
    if (decl.important) {
      throw new errors.InvalidBlockSyntax(
        `!important is not allowed for \`${decl.prop}\` in \`${(<postcss.Rule>decl.parent).selector}\``,
        sourceRange(file, decl),
      );
    }

  });

  return root;
}
