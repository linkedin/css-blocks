// Converts from number to class string: `[a-zA-Z][a-zA-Z0-9-_]*`
// Credit: https://github.com/ben-eb/postcss-reduce-idents/blob/master/src/lib/encode.js
function convertBase (num: number): string {
    let base = 52;
    let characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let character: number = num % base;
    let result: string = characters[character];
    let remainder: number = Math.floor(num / base);
    if (remainder) {
        base = 64;
        characters = characters + '0123456789-_';
        while (remainder) {
            character = remainder % base;
            remainder = Math.floor(remainder / base);
            result = result + characters[character];
        }
    }
    return result;
}

// Generate a unique integer id (unique within the entire client session).
export default class IDGenerator {
  private prefix: string;
  private count = 0;

  constructor(prefix: string){
    this.prefix = prefix;
  }

  next(): string{
    return this.prefix + convertBase(this.count++);
  }
}
