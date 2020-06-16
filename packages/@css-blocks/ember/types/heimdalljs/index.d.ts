declare module 'heimdalljs' {
  interface Schema<T> {
    new (): T;
  }
  interface Node<T> {
    stats: T;
    stop(): void;
  }
  namespace heimdall {
    export function start<T>(label: string, schema?: Schema<T>): Node<T>;
    export function node<T, R>(label: string, schema: Schema<T>, callback: (instrumentation: T) => R): R;
  }
  export = heimdall;
}