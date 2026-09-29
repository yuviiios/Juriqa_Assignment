import mammoth from "mammoth";

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value as string;

    if (!text || text.trim().length === 0) {
      throw new Error("No readable text found in DOCX");
    }

    return text;
  } catch (err) {
    throw new Error("Failed to extract text from DOCX");
  }
}
