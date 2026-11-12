/** Returns the anchor that GitHub gives a heading: lowercase, punctuation removed, each space a hyphen. */
export function headingSlug(heading: string): string {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

/** Returns every heading anchor in a markdown file. GitHub adds -1, -2, and so on to repeated slugs. */
export function headingAnchors(text: string): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  for (const match of withoutFences(text).matchAll(/^#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/gm)) {
    const slug = headingSlug(match[1]);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return anchors;
}

/** Blanks fenced code blocks but keeps their line breaks, so offsets still map to the right line. */
export function withoutFences(text: string): string {
  return text.replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, (block) => block.replace(/[^\n]/g, ""));
}
