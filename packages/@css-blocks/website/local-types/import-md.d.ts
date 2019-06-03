// Allow webpack imports of css files.
declare module '*.md' {
  interface output {
    attributes: any;
    body: string;
    html: string;
  }
  const value: output;
  export default value;
}