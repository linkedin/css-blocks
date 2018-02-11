export = regexpu_core;

interface RegExpUOpts {
  unicodePropertyEscape: boolean;
  dotAllFlag: boolean;
  useUnicodeFlag: boolean;
}
/**
* @param pattern the regular expression string
* @param [flags] a string containing the letters i (ignore case), u (unicode), and s (dot matches newlines)
* @returns a regular expression string that is suitable for passing to the JS RegExp constructor.
**/
declare function regexpu_core(pattern: string, flags?: string, options?: Partial<RegExpUOpts>): string;
