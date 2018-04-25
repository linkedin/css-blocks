import * as path from "path";
export function isBlockFilename(filename: string): boolean {
    return path.parse(filename).ext === ".css";
}
