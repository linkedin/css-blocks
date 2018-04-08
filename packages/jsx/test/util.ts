import { Analyzer, Options } from "../src/index";

export async function testParse(data: string, filename = "", opts?: Partial<Options>): Promise<Analyzer> {
  let analyzer = new Analyzer("test-analyzer", opts);
  await analyzer.parse(filename, data);
  return analyzer;
}

export async function testParseFile(file: string, opts?: Partial<Options>): Promise<Analyzer> {
  let analyzer = new Analyzer("test-analyzer", opts);
  await analyzer.parseFile(file);
  return analyzer;
}
