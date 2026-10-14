export interface Frontmatter {
  data: Record<string, string>;
  body: string;
}

// Parses the flat `key: value` frontmatter that skills use. Nested YAML isn't
// supported; lint-content rejects lines that this parser can't read.
export function parseFrontmatter(text: string): Frontmatter | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return undefined;
  const data: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`Unsupported frontmatter line: ${line}`);
    data[kv[1]] = unquote(kv[2].trim());
  }
  return { data, body: text.slice(match[0].length) };
}

function unquote(value: string): string {
  if (value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0]) {
    return value.slice(1, -1);
  }
  return value;
}
