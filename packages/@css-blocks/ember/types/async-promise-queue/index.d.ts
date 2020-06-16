declare module 'async-promise-queue' {
  import * as Async from 'async';
  function queue<T extends Function>(worker: Async.AsyncWorker<T>, Work: Array<T>, concurrency: number): Promise<void>;
  namespace queue {
    export const async: typeof Async;
  }
  export = queue;
}