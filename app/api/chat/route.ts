import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { documentId, question } = await request.json();

    if (!documentId || !question) {
      return NextResponse.json(
        { error: "Missing documentId or question" },
        { status: 400 }
      );
    }

    const answer = `Placeholder answer for: ${question}`;

    return NextResponse.json({
      answer,
      quotes: [],
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 500 }
    );
  }
}
