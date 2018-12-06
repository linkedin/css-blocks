import { outdent } from "outdent";

export interface HasToString {
  toString(): string;
}

export function indented(strings: TemplateStringsArray, ...values: HasToString[]): string {
  return outdent(strings, ...values);
}
