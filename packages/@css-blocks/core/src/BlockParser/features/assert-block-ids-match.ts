import { postcss } from "opticss";

import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { FileIdentifier } from "../../importing";
import { sourceRange } from "../../SourceLocation";
import { stripQuotes } from "../utils";

export async function assertBlockIdsMatch(block: Block, configuration: Configuration, root: postcss.Root, identifier: FileIdentifier, expected?: string): Promise<postcss.Root> {
  let foundIdDecl = false;
  let scopeNode;

  root.walkRules(":scope", (rule) => {
    scopeNode = rule;
    rule.walkDecls("block-id", (decl) => {
      if (expected && stripQuotes(decl.value) !== expected) {
        block.addError(
          new errors.InvalidBlockSyntax(
            `Expected block-id property in definition data to match header in Compiled CSS.`,
            sourceRange(configuration, root, identifier, decl),
          ),
        );
      }
      foundIdDecl = true;
    });
  });

  if (!foundIdDecl) {
    if (scopeNode) {
      block.addError(
        new errors.InvalidBlockSyntax(
          `Expected block-id to be declared in definition's :scope rule.`,
          sourceRange(configuration, root, identifier, scopeNode),
        ),
      );
    } else {
      block.addError(
        new errors.InvalidBlockSyntax(
          `Expected block-id to be declared in definition's :scope rule.`,
          {
            filename: identifier,
          },
        ),
      );
    }
  }

  return root;
}
