import { postcss } from "opticss";

import { CLASS_NAME_IDENT } from "../../BlockSyntax";
import * as errors from "../../errors";
import { FileIdentifier } from "../../importing";
import { stripQuotes } from "../utils";

export async function assertBlockClassDeclared(root: postcss.Root, identifier: FileIdentifier): Promise<postcss.Root> {
  let foundClassDecl = false;

  root.walkRules(":scope", (rule) => {
    rule.walkDecls("block-class", (decl) => {
      const classVal = stripQuotes(decl.value);
      if (!CLASS_NAME_IDENT.exec(classVal)) {
        throw new errors.InvalidBlockSyntax(
          `Illegal block class. '${decl.value}' is not a legal CSS identifier.\nIdentifier: ${identifier}`,
        );
      }
    });
  });

  if (!foundClassDecl) {
    throw new errors.InvalidBlockSyntax(
      `Expected block-class to be declared in definition data.\nIdentifier: ${identifier}`,
    );
  }

  return root;
}
