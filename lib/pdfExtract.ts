// @ts-expect-error - pdf-parse lacks types
import pdfParse from "pdf-parse";

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    const text = data.text as string;

    if (!text || text.trim().length === 0) {
      throw new Error("No readable text found in PDF");
    }

    return text;
  } catch (err) {
    if (err instanceof Error && err.message.includes("No readable text")) {
      throw err;
    }
    throw new Error("Failed to extract text from PDF");
  }
}
