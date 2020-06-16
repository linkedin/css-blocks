declare module 'heimdalljs-logger' {
  namespace loggerGenerator {
    interface Logger {
      info(...args: Array<unknown>): void;
      debug(...args: Array<unknown>): void;
    }
  }
  function loggerGenerator(name: string): loggerGenerator.Logger;
  export = loggerGenerator;
}