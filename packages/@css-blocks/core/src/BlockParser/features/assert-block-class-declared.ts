import { postcss } from "opticss";

import { CLASS_NAME_IDENT } from "../../BlockSyntax";
import { Block } from "../../BlockTree";
import { Configuration } from "../../configuration";
import * as errors from "../../errors";
import { FileIdentifier } from "../../importing";
import { sourceRange } from "../../SourceLocation";
import { stripQuotes } from "../utils";

export async function assertBlockClassDeclared(block: Block, configuration: Configuration, root: postcss.Root, identifier: FileIdentifier): Promise<postcss.Root> {
  let foundClassDecl = false;
  let scopeNode;

  root.walkRules(":scope", (rule) => {
    scopeNode = rule;
    rule.walkDecls("block-class", (decl) => {
      const classVal = stripQuotes(decl.value);
      if (!CLASS_NAME_IDENT.exec(classVal)) {
        block.addError(
          new errors.InvalidBlockSyntax(
            `Illegal block class. '${decl.value}' is not a legal CSS identifier.`,
            sourceRange(configuration, root, identifier, decl),
          ),
        );
      }
    });
  });

  if (!foundClassDecl) {
    if (scopeNode) {
      block.addError(
        new errors.InvalidBlockSyntax(
          `Expected block-class to be declared on :scope node.`,
          sourceRange(configuration, root, identifier, scopeNode),
        ),
      );
    } else {
      block.addError(
        new errors.InvalidBlockSyntax(
          `Expected block-class to be declared on :scope node.`,
          {
            filename: identifier,
          },
        ),
      );
    }
  }

  return root;
}
