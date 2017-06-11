import * as path from "path";

export function fixture(fixturePath: string) {
  let p = path.resolve(__dirname, '..', '..', 'test', 'fixtures', fixturePath);
  return p;
}
