import { Block, MergedObjectMap } from "./Block";
import { State } from "./State";
import { BlockClass } from "./BlockClass";
import { StateInfo, PropertyContainer } from "./Base";

export { Block, MergedObjectMap, State, BlockClass, StateInfo, PropertyContainer };

export type BlockObject = Block | BlockClass | State;
