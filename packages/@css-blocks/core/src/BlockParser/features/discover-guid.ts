import { postcss } from "opticss";

import { BLOCK_ID } from "../../BlockSyntax";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { sourceRange } from "../../SourceLocation";
import { stripQuotes } from "../utils";

export function discoverGuid(configuration: Configuration, root: postcss.Root, file: string, isDfnFile = false, expectedId?: string): string | undefined {
  let blockId: string | undefined;
  let scopeNode: postcss.Rule | undefined;

  // Only definition files can have GUIDs declared. It's not a critical failure if it's
  // defined... we'll check for this and complain about it later.
  if (!isDfnFile) {
    return;
  }

  root.walkRules(":scope", (rule) => {
    scopeNode = rule;
    rule.walkDecls(BLOCK_ID, (decl) => {
      blockId = stripQuotes(decl.value.trim());
      // We don't have to expect an ID was declared in the header comment of the Compiled CSS
      // file, but we need to hard error if it's a mismatch.
      if (expectedId && blockId !== expectedId) {
        throw new errors.InvalidBlockSyntax(
          `Expected block-id property in definition data to match header in Compiled CSS.`,
          sourceRange(configuration, root, file, decl),
        );
      }
    });
  });

  // It's a critical failure if we can't find a block ID in the definition file, because
  // without it we can't reason about the Compiled CSS linked to this definition.
  if (!blockId) {
    if (scopeNode) {
      throw new errors.InvalidBlockSyntax(
        `Expected block-id to be declared in definition's :scope rule.`,
        sourceRange(configuration, root, file, scopeNode),
        );
    } else {
      throw new errors.InvalidBlockSyntax(
        `Expected block-id to be declared in definition's :scope rule.`,
        {
          filename: file,
        },
      );
    }
  }

  return blockId;
}
