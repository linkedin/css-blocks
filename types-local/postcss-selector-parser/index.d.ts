// Type definitions for postcss-selector-parser 2.2.3
// Definitions by: Chris Eppstein <chris@eppsteins.net>

/*~ Note that ES6 modules cannot directly export callable functions.
 *~ This file should be imported using the CommonJS-style:
 *~   import x = require('someLibrary');
 *~
 *~ Refer to the documentation to understand common
 *~ workarounds for this limitation of ES6 modules.
 */

/*~ This declaration specifies that the function
 *~ is the exported object from the file
 */
export = parser;

/*~ This example shows how to have multiple overloads for your function */
declare function parser(processor?: (parser: parser.Parser) => void): parser.Processor;

/*~ If you want to expose types from your module as well, you can
 *~ place them in this block. Often you will want to describe the
 *~ shape of the return type of the function; that type should
 *~ be declared in here, as this example shows.
 */
declare namespace parser {
    const TAG: string;
    const STRING: string;
    const SELECTOR: string;
    const ROOT: string;
    const PSEUDO: string;
    const NESTING: string;
    const ID: string;
    const COMMENT: string;
    const COMBINATOR: string;
    const CLASS: string;
    const ATTRIBUTE: string;
    const UNIVERSAL: string;

    interface Options {
        lossless: boolean;
    }
    class Processor {
        res: Root;
        readonly result: String;
        process(selectors: string, options?: Options): Processor;
    }
    interface ParserOptions {
        css: string;
        error: (e: Error) => void;
        options: Options;
    }
    class Parser {
        input: ParserOptions;
        lossy: boolean;
        position: number;
        root: Root;
        selectors: string;
        current: Selector;
      constructor(input: ParserOptions);
      loop(): Root;
    }
    interface NodeSource {
        start?: {
            line: number,
            column: number
        },
        end?: {
            line: number,
            column: number
        }
    }
    interface NodeOptions {
        value: string;
        spaces?: {
            before: string;
            after: string;
        }
        source?: NodeSource;
    }
    interface AttributeOptions extends NodeOptions {
        attribute: string;
        operator: string;
        insensitive?: boolean;
        namespace?: string;
        raws?: {
          insensitive?: boolean;
        };
    }
    class Node implements NodeOptions {
        parent?: Selector;
        type: string;
        value: string;
        spaces?: {
            before: string;
            after: string;
        }
        source?: NodeSource;
        constructor(opts?: NodeOptions)
        remove(): Node;
        replaceWith(...nodes: Node[]): Node;
        next(): Node;
        prev(): Node;
        clone(opts: Node): Node;
        toString(): string;

    }
    interface ContainerOptions extends NodeOptions {
        nodes?: Node[];
    }
    class Container extends Node implements ContainerOptions {
        nodes: Node[];
        constructor(opts?: ContainerOptions)
        append(selector: Selector): Container;
        prepend(selector: Selector): Container;
        at(index: number): Node;
        index(child: Node): number;
        readonly first: Node;
        readonly last: Node;
        readonly length: number;
        removeChild(child: Node): Container;
        removeAll(): Container;
        empty(): Container;
        insertAfter(oldNode: Node, newNode: Node): Container;
        insertBefore(oldNode: Node, newNode: Node): Container;
        each(callback: (node: Node) => boolean | void): boolean | undefined;
        walk(callback: (node: Node) => boolean | void): boolean | undefined;
        walkAttributes(callback: (node: Node) => boolean | void): boolean | undefined;
        walkClasses(callback: (node: Node) => boolean | void): boolean | undefined;
        walkCombinators(callback: (node: Node) => boolean | void): boolean | undefined;
        walkComments(callback: (node: Node) => boolean | void): boolean | undefined;
        walkIds(callback: (node: Node) => boolean | void): boolean | undefined;
        walkNesting(callback: (node: Node) => boolean | void): boolean | undefined;
        walkPseudos(callback: (node: Node) => boolean | void): boolean | undefined;
        walkTags(callback: (node: Node) => boolean | void): boolean | undefined;
        split(callback: (node: Node) => boolean): [Node[], Node[]];
        map(callback: (node: Node) => Node): Node[];
        reduce<T>(callback: (node: Node) => Node, memo: T): T;
        every(callback: (node: Node) => boolean): boolean;
        some(callback: (node: Node) => boolean): boolean;
        filter(callback: (node: Node) => boolean): Node[];
        sort(callback: (nodeA: Node, nodeB: Node) => number): Node[];
        toString(): string;
    }
    interface RootOptions extends ContainerOptions { }
    class Root extends Container implements RootOptions {
        constructor(opts?: RootOptions)
    }
    interface SelectorOptions extends ContainerOptions { }
    class Selector extends Container implements SelectorOptions {
        constructor(opts?: SelectorOptions)
    }
    interface CombinatorOptions extends NodeOptions { }
    class Combinator extends Node { }
    interface NamespaceOptions extends NodeOptions {
        ns?: string;
    }
    class Namespace extends Node {
        readonly ns: string;
    }
    interface ClassOptions extends NamespaceOptions { }
    class ClassName extends Namespace implements ClassOptions { }
    class Attribute extends Node implements AttributeOptions {
        attribute: string;
        operator: string;
        insensitive: boolean;
        namespace: string;
        raws: {
          insensitive: boolean;
        };
        constructor(opts?: AttributeOptions);
        toString(): string;
    }
    interface PseudoOptions extends NodeOptions {
    }
    class Pseudo extends Container implements PseudoOptions {
    }
    function attribute(opts: AttributeOptions): Attribute;
    function className(opts: ClassOptions): ClassName;
    function combinator(opts: CombinatorOptions): Combinator;
    function pseudo(opts: PseudoOptions): Pseudo;
    function comment(opts: any): any;
    function id(opts: any): any;
    function nesting(opts: any): any;
    function root(opts: any): any;
    function selector(opts: any): any;
    function string(opts: any): any;
    function tag(opts: any): any;
    function universal(opts: any): any;
}