import { ObjectDictionary } from "@opticss/util";

export interface HasScopeLookup<ScopedType> {
  lookup(dotExpression: string): ScopedType | undefined;
}

export type Splitter = (reference: string) => [string, string] | undefined;

/**
 * Implements a lookup of a dotted reference through a hierarchy of scopes.
 * This implementation consumes up to the first dot and delegates the rest
 * to a recursive lookup -- the implementation of which needn't follow the
 * same lookup system. If no value is found before the first dot, a local
 * scope lookup is done on the entire string.
 *
 * TODO: return information about why a thing wasn't found.
 */
export abstract class LocalScope<ScopeContext, ScopedType>
  implements HasScopeLookup<ScopedType>
{
  private split: Splitter;
  protected _defaultContext: ScopeContext | undefined;
  private findScope: (context: ScopeContext | undefined, contextName: string) => HasScopeLookup<ScopedType> | undefined;
  private finder: (context: ScopeContext, name: string) => ScopedType | undefined;

  constructor(
    findScope: (context: ScopeContext | undefined, contextName: string) => HasScopeLookup<ScopedType> | undefined,
    finder: (context: ScopeContext, name: string) => ScopedType | undefined,
    split: (reference: string) => [string, string] | undefined,
    defaultContext?: ScopeContext,
  ) {
    this.defaultContext = defaultContext;
    this.findScope = findScope;
    this.finder = finder;
    this.split = split;
  }

  get defaultContext(): ScopeContext | undefined {
    return this._defaultContext;
  }
  set defaultContext(defaultContext: ScopeContext | undefined)  {
    this._defaultContext = defaultContext;
  }

  /**
   * Lookup a sub-block either locally, or on a referenced foreign block.
   * @param expression A reference to a sub-block of the form `(<block-name>.)<sub-block-selector>`
   * @returns The Style referenced at the supplied path.
   */
  lookup(expression: string): ScopedType | undefined {
    // Try to split the reference string to find block name reference. If there
    // is a block name reference, fetch the named block and run lookup in that context.
    let split = this.split(expression);
    if (split) {
      let [ref, name] = split;

      if (ref) {
        let subScope = this.findScope(this.defaultContext, ref);
        if (subScope) {
          return subScope.lookup(name);
        } else {
          return undefined;
        }
      }
    }
    if (this.defaultContext) {
      return this.finder(this.defaultContext, expression);
    }
    return undefined;
  }
}

export interface HasLocalScope<ScopeContext, ScopedType> {
  subScope(name: string): LocalScope<ScopeContext, ScopedType> | undefined;
  lookupLocal(name: string): ScopedType | undefined;
}

export class LocalScopedContext<ScopeContext extends HasLocalScope<ScopeContext, ScopedType>, ScopedType> extends LocalScope<ScopeContext, ScopedType> {
  constructor(split: Splitter, defaultContext: ScopeContext) {
    super(
      (context: ScopeContext | undefined, contextName: string) => context && context.subScope(contextName),
      (context: ScopeContext, name: string) => context.lookupLocal(name),
      split,
      defaultContext);
  }
}

export class CustomLocalScope<
  ScopeContext extends HasScopeLookup<ScopedType>
                     & HasLocalScope<ScopeContext, ScopedType>,
  ScopedType
> extends LocalScope<ScopeContext, ScopedType> {
  private subScopes: ObjectDictionary<ScopeContext>;
  constructor(split: Splitter, subScopes?: ObjectDictionary<ScopeContext>) {
    super(
      (context: ScopeContext | undefined, contextName: string) => {
        if (context) {
          return context.subScope(contextName);
        } else {
          return this.subScopes[contextName];
        }
      },
      (context: ScopeContext, name: string) => context.lookupLocal(name),
      split,
    );
    this.subScopes = subScopes || {};
  }
  get defaultContext(): ScopeContext | undefined {
    return this.subScopes[""];
  }
  set defaultContext(defaultContext: ScopeContext | undefined) {
    if (defaultContext) {
      this.subScopes[""] = defaultContext;
    } else {
      if (this.subScopes) {
        delete this.subScopes[""];
      }
    }
  }
  setSubScope(localName: string, context: ScopeContext) {
    this.subScopes[localName] = context;
  }
}