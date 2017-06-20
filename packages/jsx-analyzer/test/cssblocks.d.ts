declare module '*.block.css' {
    export let states: any;
    let block: any;
    export default block;
}

declare module 'obj-str' {
  function objstr(o: any): string;
  export default objstr;
}
