import { EmberAppAddon } from "./_utils";

type AllocatorRange = {startValue: number; maxCount: number};
type ModuleRange = Map<string, AllocatorRange>;

class IDAllocator {
  modules: Map<EmberAppAddon, ModuleRange> = new Map();
  startValue: number;
  defaultMaxCount: number;

  constructor(startValue = 1, defaultMaxCount = 500) {
    this.startValue = startValue;
    this.defaultMaxCount = defaultMaxCount;
  }

  allocateRange(maxCount = this.defaultMaxCount) {
    let startValue = this.startValue;
    this.startValue += maxCount;
    return { startValue, maxCount };
  }

  getRangeForModuleAndType(mod: EmberAppAddon, type: string): AllocatorRange {
    let ranges: ModuleRange = new Map();
    if (!this.modules.has(mod)) {
      ranges.set(type, this.allocateRange());
      this.modules.set(mod, ranges);
    } else {
      // we know it will exist per code above, so cast as ModuleRange
      ranges = this.modules.get(mod) as ModuleRange;
      if (!ranges.has(type)) {
        ranges.set(type, this.allocateRange());
      }
    }
    // As above - we know this will exist
    return ranges.get(type) as AllocatorRange;
  }
}

export { IDAllocator };
