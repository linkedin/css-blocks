import * as debugGenerator from "debug";
import Async from "async";

// The async type declaration uses this but doesn't export it :face_with_rolling_eyes:
interface AsyncQueue<T> {
    length(): number;
    started: boolean;
    running(): number;
    idle(): boolean;
    concurrency: number;
    push<E>(task: T, callback?: ErrorCallback<E>): void;
    push<E>(task: T, callback?: AsyncResultCallback<T, E>): void;
    push<E>(task: T[], callback?: ErrorCallback<E>): void;
    unshift<E>(task: T, callback?: ErrorCallback<E>): void;
    unshift<E>(task: T[], callback?: ErrorCallback<E>): void;
    saturated: () => any;
    empty: () => any;
    drain: () => any;
    paused: boolean;
    pause(): void;
    resume(): void;
    kill(): void;
    workersList(): {
        data: T,
        callback: Function
    }[];
    error(error: Error, data: any): void;
    unsaturated(): void;
    buffer: number;
}

const debug = debugGenerator("css-blocks");
interface PendingWork<WorkItem, Result> {
  id: number;
  result?: Result;
  item: WorkItem;
}

let queueInstanceId = 1;
/**
 * This queue ensures a max conconcurrency and that, on error, all concurrent
 * work is completed before the error is propagated. New work can be added as
 * needed.
 */
export class PromiseQueue<WorkItem, Result> {
  private _concurrency: number;
  private queueId: number;
  private jobId: number;
  private queue: AsyncQueue<PendingWork<WorkItem, Result>>;
  private draining: Promise<void>;
  private promiseProcessor: (item: WorkItem) => Promise<Result>;
  constructor(concurrency: number, processor: (item: WorkItem) => Promise<Result>) {
    this.promiseProcessor = processor;
    this.queue = Async.queue<PendingWork<WorkItem, Result>, Error>(this.processWork.bind(this), concurrency);
    this.queueId = queueInstanceId++;
    this._concurrency = concurrency;
    this.jobId = 0;
  }

  private processWork(work: PendingWork<WorkItem, Result>, callback: (err?: any) => void) {
    this.debug(`[Job:${work.id}] Starting job.`);
    this.promiseProcessor(work.item).then((result: Result) => {
      this.debug(`[Job:${work.id}] Finished. Recording result.`);
      work.result = result;
      callback();
    }, (error: any) => {
      this.debug(`[Job:${work.id}] Errored.`);
      callback(error);
    });
  }

  get activeJobCount() {
    return this.queue.running();
  }
  get concurrency() {
    return this.queue.concurrency;
  }

  debug(message: string) {
    debug(`[Queue:${this.queueId}] ${message}`);
  }

  drain(): Promise<void> {
    if (!this.draining) {
      this.queue.pause();
      this.draining = new Promise<void>((resolve, _reject) => {
        this.debug(`Starting to drain current work queue.`);
        this.queue.drain = () => {
          this.debug(`queue is drained`);
          resolve();
        };
      });
    }
    return this.draining;
  }

  restart() {
    this.queue.resume();
  }
  enqueue(item: WorkItem): Promise<Result> {
    let id = this.jobId++;
    return new Promise<Result>((resolve, reject) => {
      this.debug(`[Job:${id}] Added to queue.`);
      let work: PendingWork<WorkItem, Result> = {id, item};
      this.queue.push(work, (err) => {
        if (err) {
          this.debug(`[Job:${id}] Failed.`);
          this.drain().then(() => {
            this.debug(`[Job:${id}] Done draining. Rejecting promise.`);
            reject(err);
          });
        } else {
          if (Object.keys(work).indexOf("result")) {
            this.debug(`[Job:${id}] Complete. Resolving promise.`);
            resolve(work.result);
          } else {
            this.debug(`[Job:${id}] WTF! Result missing.`);
            let error = new Error("there's no result to return. this is an internal error.");
            reject(error);
          }
        }
      });
    });
  }
}