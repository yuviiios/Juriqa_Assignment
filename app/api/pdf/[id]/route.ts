import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const doc = await getDocument(id);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const filepath = path.join(
      process.cwd(),
      "data/uploads",
      doc.filename
    );

    const buffer = await fs.readFile(filepath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("PDF fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch PDF" },
      { status: 500 }
    );
  }
}
