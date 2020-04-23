declare module "broccoli-funnel" {
  import { InputNode } from "broccoli-node-api";
  namespace funnel {
    type FunnelOptions = Optional<{
      annotation: string;
      srcDir: string;
      destDir: string;
      allowEmpty: boolean;
      include: Array<string | RegExp | ((string) => boolean)>;
      exclude: Array<string | ((string) => boolean)>;
      files: Array<string>;
      getDestinationPath(file: string): string;
    }>;
  }
  function funnel(inputNode: InputNode, options: funnel.FunnelOptions);
  export = funnel;
}