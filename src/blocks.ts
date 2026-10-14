// A block is the dotagents-owned region inside a file that other people also
// edit, such as AGENTS.md. Text outside the markers is never touched.

export const BLOCK_START = "<!-- dotagents:start -->";
export const BLOCK_END = "<!-- dotagents:end -->";

const BLOCK_PATTERN = new RegExp(`${escape(BLOCK_START)}\\n([\\s\\S]*?)\\n?${escape(BLOCK_END)}\\n?`);

export function readBlock(text: string): string | undefined {
  return BLOCK_PATTERN.exec(text)?.[1];
}

export function upsertBlock(text: string | undefined, body: string): string {
  const block = `${BLOCK_START}\n${body.trim()}\n${BLOCK_END}\n`;
  if (text === undefined || text.trim() === "") return block;
  if (BLOCK_PATTERN.test(text)) return text.replace(BLOCK_PATTERN, () => block);
  return `${text.replace(/\n*$/, "\n")}\n${block}`;
}

export function removeBlock(text: string): string {
  const match = BLOCK_PATTERN.exec(text);
  if (!match) return text;
  const before = text.slice(0, match.index).replace(/\n+$/, "\n");
  const after = text.slice(match.index + match[0].length);
  const joined = before + after;
  return joined.trim() === "" ? "" : joined;
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
