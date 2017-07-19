export = inline_source_map_comment;

declare interface Options {
    block: boolean,
    sourcesContent: boolean,
}

declare function inline_source_map_comment(map: any, options: Partial<Options>, ...args: any[]): any;

declare namespace inline_source_map_comment {
    const prefix: string;
}

