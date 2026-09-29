import { NextRequest, NextResponse } from "next/server";
import { listDocuments, deleteDocument } from "@/lib/storage";

export async function GET() {
  try {
    const docs = await listDocuments();
    return NextResponse.json(
      docs.map((d) => ({
        id: d.id,
        filename: d.originalName,
        uploadedAt: d.uploadedAt,
      }))
    );
  } catch (err) {
    console.error("List error:", err);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Document ID required" },
        { status: 400 }
      );
    }

    await deleteDocument(id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
