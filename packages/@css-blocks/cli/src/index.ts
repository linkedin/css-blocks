import { BlockFactory, CssBlockError, Preprocessors } from "@css-blocks/core";
import chalk = require("chalk");
import fs = require("fs");
import fse = require("fs-extra");
import path = require("path");
import util = require("util");
import yargs = require("yargs");

const writeFile = util.promisify(fs.writeFile);

interface GlobalArgs {
  preprocessors: string | undefined;
  [k: string]: unknown;
}

interface ValidateArgs extends GlobalArgs {
  blocks: unknown;
}

interface ValidateOptions {
  preprocessors?: string;
}

export class CLI {
  constructor() {
  }

  run(args: Array<string>): Promise<void> {
    let argv = this.argumentParser().parse(args);
    if (argv.promise) {
      return argv.promise as Promise<void>;
    } else {
      return Promise.resolve();
    }
  }

  get chalk() {
    return chalk.default;
  }

  argumentParser() {
    return yargs
      .scriptName("css-blocks")
      .usage("$0 <cmd> [options] block-dir-or-file...")
      .version()
      .strict()
      .option("preprocessors", {
        type: "string",
        global: true,
        description: "A JS file that exports an object that maps extensions to a preprocessor function for that type.",
        nargs: 1,
      })
      .command<ValidateArgs>(
        "validate <blocks..>",
        "Validate block file syntax.", (y) =>
          y.positional("blocks", {
            description: "files or directories containing css blocks.",
          }),
        (argv: ValidateArgs) => {
          let { preprocessors } = argv;
          argv.promise = this.validate(argv.blocks as Array<string>, {
            preprocessors,
          });
        },
      )
      .demandCommand(1, "No command was provided.")
      .help();
  }

  async validate(blockFiles: Array<string>, options: ValidateOptions) {
    let preprocessors: Preprocessors = options.preprocessors ? require(path.resolve(options.preprocessors)) : {};
    let factory = new BlockFactory({preprocessors});
    let errorCount = 0;
    for (let blockFile of blockFiles) {
      try {
        await factory.getBlockFromPath(path.resolve(blockFile));
        this.println(`${this.chalk.green("ok")}\t${path.relative(process.cwd(), path.resolve(blockFile))}`);
      } catch (e) {
        errorCount++;
        if (e instanceof CssBlockError) {
          let loc = e.location;
          let filename = path.relative(process.cwd(), path.resolve(loc && loc.filename || blockFile));
          let message = `${this.chalk.red("error")}\t${this.chalk.whiteBright(filename)}`;
          if (loc && loc.filename && loc.line && loc.column) {
            message += `:${loc.line}:${loc.column}`;
          }
          message += ` ${e.origMessage}`;
          this.println(message);
        } else {
          console.error(e);
        }
      }
    }
    this.exit(errorCount);
  }

  println(...args: Array<string>) {
    // tslint:disable-next-line:no-console
    console.log(...args);
  }

  async writeFile(filename: string, contents: string): Promise<void> {
    await fse.mkdirp(path.dirname(filename));
    return writeFile(filename, contents, "utf8");
  }

  exit(code = 0) {
    process.exit(code);
  }
}
