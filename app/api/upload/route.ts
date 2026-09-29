import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { extractTextFromPDF } from "@/lib/pdfExtract";
import { extractTextFromDOCX } from "@/lib/docxExtract";
import { saveDocument } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are supported" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const id = randomUUID();

    let textContent: string;
    let fileType: "pdf" | "docx";

    try {
      if (file.type === "application/pdf") {
        textContent = await extractTextFromPDF(buffer);
        fileType = "pdf";
      } else {
        textContent = await extractTextFromDOCX(buffer);
        fileType = "docx";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Text extraction failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await saveDocument(id, buffer, file.name, fileType, textContent);

    return NextResponse.json({
      id,
      filename: file.name,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
