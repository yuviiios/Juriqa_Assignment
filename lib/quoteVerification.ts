export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function verifyQuote(quote: string, documentText: string): boolean {
  const normalizedQuote = normalizeWhitespace(quote);
  const normalizedDoc = normalizeWhitespace(documentText);

  return normalizedDoc.includes(normalizedQuote);
}

export function findQuotePosition(
  quote: string,
  documentText: string
): { start: number; end: number } | null {
  const normalizedQuote = normalizeWhitespace(quote);
  const normalizedDoc = normalizeWhitespace(documentText);

  const start = normalizedDoc.indexOf(normalizedQuote);
  if (start === -1) return null;

  return {
    start,
    end: start + normalizedQuote.length,
  };
}
