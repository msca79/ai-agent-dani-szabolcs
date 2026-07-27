// Csak azt a szűk markdown-részhalmazt kezeli, amit a system prompt szerint az
// agent tényleg használ (félkövér, dőlt, inline kód, felsorolás, bekezdés) —
// nem cél egy teljes markdown-parser. A HTML-escape mindig előbb fut, mint az
// inline formázás, így az LLM-válaszban lévő nyers `<`/`>` sosem interpretálódik
// tag-ként (XSS-biztos), a `<strong>`/`<em>`/... tageket csakis ez a függvény
// generálja, sose a bemenetből.
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(line: string): string {
  return escapeHtml(line)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

export function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listTag: 'ul' | 'ol' | null = null;

  const flushParagraph = (): void => {
    if (paragraphLines.length > 0) {
      blocks.push(`<p>${paragraphLines.map(renderInline).join('<br>')}</p>`);
      paragraphLines = [];
    }
  };

  const flushList = (): void => {
    if (listTag) {
      blocks.push(`<${listTag}>${listItems.map((item) => `<li>${renderInline(item)}</li>`).join('')}</${listTag}>`);
      listItems = [];
      listTag = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.length === 0) {
      flushParagraph();
      flushList();
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.*)$/.exec(line);
    const orderedMatch = /^\d+\.\s+(.*)$/.exec(line);

    if (unorderedMatch) {
      flushParagraph();
      if (listTag !== 'ul') {
        flushList();
        listTag = 'ul';
      }
      listItems.push(unorderedMatch[1]);
      continue;
    }

    if (orderedMatch) {
      flushParagraph();
      if (listTag !== 'ol') {
        flushList();
        listTag = 'ol';
      }
      listItems.push(orderedMatch[1]);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks.join('');
}
