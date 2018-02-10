import * as minimatch from 'minimatch';
const BLOCK_PATTERN = new minimatch.Minimatch('*.block.*', { matchBase: true });
export function isBlockFilename(filename: string): boolean {
    return BLOCK_PATTERN.match(filename);
}
