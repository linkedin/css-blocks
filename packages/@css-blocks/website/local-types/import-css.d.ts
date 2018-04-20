// Allow webpack imports of css files.
declare module '*.css' {
    export let block: any;
    export default block;
}
declare module '*.scss' {
    export let block: any;
    export default block;
}
