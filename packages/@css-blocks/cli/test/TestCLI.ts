import { CLI } from "../src/index";

export class TestCLI extends CLI {
  output: string;
  exitCode: number | undefined;
  constructor() {
    super();
    this.output = "";
    this.chalk.enabled = false;
  }
  println(text: string) {
    this.output += text + "\n";
  }
  argumentParser() {
    let parser = super.argumentParser();
    parser.exitProcess(false);
    return parser;
  }
  exit(code: number) {
    this.exitCode = code;
  }
}
