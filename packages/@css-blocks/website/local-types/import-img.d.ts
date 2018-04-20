// Allow webpack imports of image files.
declare module '*.svg' {
    export let uri: string;
    export default uri;
}
declare module '*.png' {
    export let uri: string;
    export default uri;
}
declare module '*.jpg' {
    export let uri: string;
    export default uri;
}
declare module '*.jpeg' {
    export let uri: string;
    export default uri;
}
