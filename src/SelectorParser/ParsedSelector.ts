import CompoundSelector from "./CompoundSelector";

/**
 * `ParsedSelector` serves as a container object for a `CompoundSelector` linked
 * list and provides a number of convenience methods for interacting with it.
 */
export default class ParsedSelector {
  selector: CompoundSelector;

  /**
   * @param Root `CompoundSelector` of linked list to track.
   */
  constructor(selector: CompoundSelector) {
    this.selector = selector;
  }

  /**
   * Checks if a given `CompoundSelector` is a context selector for this `ParsedSelector`.
   * @return True or false depending on if is context selector.
   */
  isContext(selector: CompoundSelector) {
    let k = this.selector;
    while (k.next !== undefined) {
      if (k === selector) return true;
      k = k.next.selector;
    }
    return false;
  }

  /**
   * Returns the key selector (last compound selector) of this selector.
   * @return Key selector.
   */
  get key(): CompoundSelector {
    return this.selector.lastSibling;
  }

  /**
   * Returns the number of `CompoundSelector` present in this `ParsedSelector`
   * @return CompoundSelector count.
   */
  get length(): number {
    let count = 0;
    let selector: CompoundSelector | undefined = this.selector;
    while (selector) {
      count++;
      selector = selector.next && selector.next.selector;
    }
    return count;
  }

  /**
   * Returns a deep clone of this `ParsedSelector` and the linked list it tracks.
   * @return new `ParsedSelector` clone.
   */
  clone(): ParsedSelector {
    return new ParsedSelector(this.selector.clone());
  }

  /**
   * Stringify this `CompoundSelector` list back into CSS.
   * @return The selector string.
   */
  toString() {
    return this.selector.toString();
  }
}
