export function unionInto<T>(target: Set<T>, ...sets: Iterable<T>[]) {
  for (let set of sets) {
    for (let v of set) {
      target.add(v);
    }
  }
}
