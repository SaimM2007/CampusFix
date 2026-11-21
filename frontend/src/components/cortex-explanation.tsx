type ExplanationBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

function cleanInlineMarkdown(text: string) {
  return text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function parseExplanation(rawText: string): ExplanationBlock[] {
  let text = rawText.trim();
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      const decoded: unknown = JSON.parse(text);
      if (typeof decoded === "string") text = decoded;
    } catch {
      text = text.slice(1, -1);
    }
  }

  text = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "    ")
    .replace(/\r\n?/g, "\n")
    .trim();

  const blocks: ExplanationBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let listOrdered = false;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: cleanInlineMarkdown(paragraph.join(" ")) });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ kind: "list", ordered: listOrdered, items: list });
    list = [];
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^#{1,6}\s+(.+)$/)
      ?? line.match(/^\*\*(.{1,80})\*\*:?\s*$/)
      ?? line.match(/^([A-Z][A-Za-z0-9 /()-]{1,60}):$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", text: cleanInlineMarkdown(heading[1].replace(/:$/, "")) });
      continue;
    }

    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (list.length && ordered !== listOrdered) flushList();
      if (!list.length) listOrdered = ordered;
      const item = bullet?.[1] ?? numbered?.[1];
      if (item) list.push(cleanInlineMarkdown(item));
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function extractCortexRecommendations(text: string): string[] | null {
  const blocks = parseExplanation(text);
  const headingIndex = blocks.findIndex((block) =>
    block.kind === "heading" && /practical follow-up actions|recommended (diagnostic )?(actions|steps)/i.test(block.text)
  );
  if (headingIndex < 0) return null;

  for (const block of blocks.slice(headingIndex + 1)) {
    if (block.kind === "heading") return null;
    if (block.kind === "list") return block.items;
  }
  return null;
}

export function CortexExplanation({ text }: { text: string }) {
  return (
    <div className="cortex-copy" aria-label="Cortex generated analysis">
      {parseExplanation(text).map((block, index) =>
        block.kind === "heading" ? <h3 key={index}>{block.text}</h3>
          : block.kind === "list" ? block.ordered
            ? <ol key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ol>
            : <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>
            : <p key={index}>{block.text}</p>
      )}
    </div>
  );
}
