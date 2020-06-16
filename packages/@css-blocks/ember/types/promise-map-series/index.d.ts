declare module 'promise-map-series' {
  function mapSeries<T,R>(series: Array<T>, mapper: (s: T) => R): Array<R>;
  export = mapSeries;
}