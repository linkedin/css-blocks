// Reduce whitespace.
export default function minify(s: string) {
  return s ? s.replace(/^[\s\n]+|[\s\n]+$/gm, '') : '';
}
