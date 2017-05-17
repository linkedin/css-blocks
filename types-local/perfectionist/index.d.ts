export = perfectionist;

declare function perfectionist(...args: any[]): any;

declare namespace perfectionist {
    function postcss(css: any): void;

    function process(css: any, ...args: any[]): any;

    namespace postcss {
        const postcssPlugin: string;

        const postcssVersion: string;

    }

}

