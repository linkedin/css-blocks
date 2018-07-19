import { Analyzer, AnalyzerOptions, Options } from "../src/index";

export async function testParse(data: string, filename = "", opts?: Options): Promise<Analyzer> {
  let analyzerOptions: Options & AnalyzerOptions = opts || {};
  analyzerOptions.analyzerName = "test-analyzer";
  let analyzer = new Analyzer(analyzerOptions);
  await analyzer.parse(filename, data);
  return analyzer;
}

export async function testParseFile(file: string, opts?: Options): Promise<Analyzer> {
  let analyzerOptions: Options & AnalyzerOptions = opts || {};
  analyzerOptions.analyzerName = "test-analyzer";
  let analyzer = new Analyzer(analyzerOptions);
  await analyzer.parseFile(file);
  return analyzer;
}
