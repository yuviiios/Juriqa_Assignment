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
    start = end - OVERLAP;
  }

  return chunks;
}

export function selectRelevantChunks(
  chunks: string[],
  query: string,
  maxChunks: number = 3
): string[] {
  const queryTerms = query.toLowerCase().split(/\s+/);

  const scored = chunks.map((chunk) => {
    const lowerChunk = chunk.toLowerCase();
    const score = queryTerms.reduce((sum, term) => {
      const matches = (lowerChunk.match(new RegExp(term, "g")) || []).length;
      return sum + matches;
    }, 0);
    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map((s) => s.chunk);
}
