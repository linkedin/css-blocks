// These constructs are **only** used in "../Block/Block.ts"!
// Can we make these internal to the package?
export {
  isAttributeNode,
  isClassNode,
  isRootNode,
  toAttrToken,
} from "./block-intermediates";

export { BlockFactory } from "./BlockFactory";
export { BlockFactorySync } from "./BlockFactorySync";

export {
  Syntax,
  Preprocessor,
  PreprocessorSync,
  OptionalPreprocessor,
  OptionalPreprocessorSync,
  Preprocessors,
  PreprocessorsSync,
  ProcessedFile,
  syntaxFromExtension,
} from "./preprocessing";
