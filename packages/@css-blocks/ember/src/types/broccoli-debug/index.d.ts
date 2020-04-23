declare module "broccoli-debug" {
  import { InputNode } from "broccoli-node-api";
  import BroccoliPlugin from "broccoli-plugin";
  namespace BroccoliDebug {
    interface BroccoliDebugOptions {
      /**
        The label to use for the debug folder. By default, will be placed in `DEBUG/*`.
      */
      label: string

      /**
        The base directory to place the input node contents when debugging is enabled.

        Chooses the default in this order:

        * `process.env.BROCCOLI_DEBUG_PATH`
        * `path.join(process.cwd(), 'DEBUG')`
      */
      baseDir: string

      /**
        Should the tree be "always on" for debugging? This is akin to `debugger`, its very
        useful while actively working on a build pipeline, but is likely something you would
        remove before publishing.
      */
      force?: boolean
    }
  }

  class BroccoliDebug extends BroccoliPlugin {

    /**
      Builds a callback function for easily generating `BroccoliDebug` instances
      with a shared prefix.
    */
    static buildDebugCallback(prefix: string): (node: any, labelOrOptions: string | BroccoliDebug.BroccoliDebugOptions) => BroccoliNode

    constructor(node: InputNode, labelOrOptions: string | BroccoliDebug.BroccoliDebugOptions);

    /**
     * The label for this tree debugger.
     */
    debugLabel: string;
  }

  export = BroccoliDebug;
}
