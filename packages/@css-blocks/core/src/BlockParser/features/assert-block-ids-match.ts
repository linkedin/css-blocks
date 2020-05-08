import { postcss } from "opticss";

import * as errors from "../../errors";
import { FileIdentifier } from "../../importing";
import { stripQuotes } from "../utils";

export async function assertBlockIdsMatch(root: postcss.Root, identifier: FileIdentifier, expected?: string): Promise<postcss.Root> {
  let foundIdDecl = false;

  if (!expected) {
    throw new Error(`No expected ID provided.\nIdentifier: ${identifier}`);
  }

  root.walkRules(":scope", (rule) => {
    rule.walkDecls("block-id", (decl) => {
      if (stripQuotes(decl.value) !== expected) {
        throw new errors.InvalidBlockSyntax(
          `Expected block-id property in definition data to match header in Compiled CSS.\nIdentifier: ${identifier}`,
        );
      }
      foundIdDecl = true;
    });
  });

  if (!foundIdDecl) {
    throw new errors.InvalidBlockSyntax(
      `Expected block-id to be declared in definition data.\nIdentifier: ${identifier}`,
    );
  }

  return root;
}
