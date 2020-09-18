import { postcss } from "opticss";

import { BLOCK_NAME, CLASS_NAME_IDENT } from "../../BlockSyntax";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { stripQuotes } from "../utils";

export function discoverName(configuration: Configuration, root: postcss.Root, file: string, isDfnFile: boolean, defaultName: string): string {
  let foundName: string | undefined;
  let scopeRule: postcss.Rule | undefined;

  // Eagerly fetch custom `block-name` from the root block rule.
  root.walkRules(":scope", (rule) => {
    scopeRule = rule;
    rule.walkDecls(BLOCK_NAME, (decl) => {
      const unquotedVal = stripQuotes(decl.value.trim());
      if (!CLASS_NAME_IDENT.test(unquotedVal)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal block name. '${decl.value}' is not a legal CSS identifier.`,
          sourceRange(configuration, root, file, decl),
        );
      }

      foundName = unquotedVal;

    });
  });

  // Definition files must include a block-name. We have an inferred one we can fall
  // back to for recovery purposes, but it should be fixed in the definition file.
  // (Else, there may be a mismatch with the Compiled CSS.)
  if (!foundName && isDfnFile) {
    if (scopeRule) {
      throw new errors.InvalidBlockSyntax(
        `block-name is expected to be declared in definition file's :scope rule.`,
        sourceRange(configuration, root, file, scopeRule),
      );
    } else {
      throw new errors.InvalidBlockSyntax(
        `block-name is expected to be declared in definition file's :scope rule.`, {
          filename: file,
        },
      );
    }
  }
  return foundName || defaultName;
}
