// tslint:disable:no-floating-promises
import * as async from "async";
import * as debugGenerator from "debug";

const debug = debugGenerator("css-blocks");
interface PendingWork<WorkItem, Result> {
  id: number;
  result?: Result;
  item: WorkItem;
}

let queueInstanceId = 1;
/**
 * This queue ensures a max concurrency and that, on error, all concurrent
 * work is completed before the error is propagated. New work can be added as
 * needed.
 */
export class PromiseQueue<WorkItem, Result> {
  private queue: async.AsyncQueue<PendingWork<WorkItem, Result>>;
  private queueId: number;
  private jobId: number;
  private draining: boolean;
  private promiseProcessor: (item: WorkItem) => Promise<Result>;
  constructor(concurrency: number, processor: (item: WorkItem) => Promise<Result>) {
    this.promiseProcessor = processor;
    this.queue = async.queue<PendingWork<WorkItem, Result>, Error>(this.processWork.bind(this), concurrency);
    this.queueId = queueInstanceId++;
    this.jobId = 0;
    this.draining = false;
  }

  private processWork(work: PendingWork<WorkItem, Result>, callback: (err?: Error | null | undefined) => void) {
    this.debug(`[Job:${work.id}] Starting job.`);
    this.promiseProcessor(work.item).then(
      (result: Result) => {
        this.debug(`[Job:${work.id}] Finished. Recording result.`);
        work.result = result;
        callback();
      },
      (error: Error | null | undefined) => {
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
    this.draining = true;
    return this.queue.drain().then(() => {
      this.draining = false;
    });
  }

  restart() {
    this.queue.resume();
  }

  enqueue(item: WorkItem): Promise<Result> {
    let id = this.jobId++;
    return new Promise<Result>((resolve, reject) => {
      if (this.draining) {
        let message = "Queue is draining, cannot enqueue job.";
        this.debug(`[Job:${id}] ${message}`);
        return reject(new Error(message));
      }
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
