const CHUNK_SIZE = 8000;
const OVERLAP = 500;

export function chunkDocument(text: string): string[] {
  if (text.length <= CHUNK_SIZE) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);

    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > start + CHUNK_SIZE / 2) {
        end = lastNewline;
      }
    }

    chunks.push(text.substring(start, end));

    // Last chunk reaches the end of the document. Stepping back by OVERLAP
    // here would leave start < text.length and re-emit the same tail forever.
    if (end >= text.length) break;

    start = end - OVERLAP;
  }

  return chunks;
}

function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function selectRelevantChunks(
  chunks: string[],
  query: string,
  maxChunks: number = 3
): string[] {
  // Questions contain "?", "(", "$" etc., which are regex metacharacters.
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .map(escapeRegExp);

  const scored = chunks.map((chunk, index) => {
    const lowerChunk = chunk.toLowerCase();
    const score = queryTerms.reduce((sum, term) => {
      const matches = (lowerChunk.match(new RegExp(term, "g")) || []).length;
      return sum + matches;
    }, 0);
    return { chunk, index, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxChunks)
    .sort((a, b) => a.index - b.index)
    .map((s) => s.chunk);
}
