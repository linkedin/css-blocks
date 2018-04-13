declare module "test-console" {
  export = testConsole;
  namespace testConsole {
    interface IgnoreOptions {
      isTTY?: boolean;
    }
    interface Output {
      inspect(): {
        output: Array<string>;
        restore(): void;
      }
      inspectSync(cb: (output: Array<string>) => any): Array<string>;
      ignore(options: IgnoreOptions): () => void;
      ignoreSync(options: IgnoreOptions, cb: () => any): void;
    }
    const stdout: Output; 
    const stderr: Output; 
  }
}