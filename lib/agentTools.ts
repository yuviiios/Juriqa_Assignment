import { normalizeWhitespace } from "./quoteVerification";

export interface ToolResult {
  toolName: string;
  result: string;
}

export function searchDocument(query: string, documentText: string): string {
  const normalizedQuery = normalizeWhitespace(query).toLowerCase();
  const lines = documentText.split("\n");

  const matches = lines
    .filter((line) => normalizeWhitespace(line).toLowerCase().includes(normalizedQuery))
    .slice(0, 5);

  if (matches.length === 0) {
    return "No matches found for: " + query;
  }

  return matches
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
    .join("\n---\n");
}

export function getSection(
  sectionNumber: number,
  documentText: string
): string {
  const sections = documentText.split(/\n(?=[0-9]+\.|\w+\.)/);

  if (sectionNumber < 1 || sectionNumber > sections.length) {
    return `Section ${sectionNumber} not found. Document has ${sections.length} sections.`;
  }

  return sections[sectionNumber - 1].substring(0, 2000);
}

export function listClauses(documentText: string): string {
  const clausePatterns = [
    "termination",
    "liability",
    "governing law",
    "confidentiality",
    "indemnification",
    "warranty",
    "payment",
    "delivery",
    "intellectual property",
    "assignment",
    "amendment",
    "force majeure",
    "entire agreement",
    "severability",
  ];

  const normalizedText = documentText.toLowerCase();
  const foundClauses = clausePatterns.filter((clause) =>
    normalizedText.includes(clause)
  );

  if (foundClauses.length === 0) {
    return "No standard clauses detected in document.";
  }

  return "Found clauses: " + foundClauses.join(", ");
}

export function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  documentText: string
): ToolResult {
  try {
    let result: string;

    switch (toolName) {
      case "search_document":
        result = searchDocument(String(args.query || ""), documentText);
        break;
      case "get_section":
        result = getSection(Number(args.section_number || 1), documentText);
        break;
      case "list_clauses":
        result = listClauses(documentText);
        break;
      default:
        result = `Unknown tool: ${toolName}`;
    }

    return { toolName, result };
  } catch (err) {
    return {
      toolName,
      result: `Error executing ${toolName}: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
