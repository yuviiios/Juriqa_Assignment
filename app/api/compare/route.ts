import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/storage";
import { chunkDocument } from "@/lib/chunks";
import Groq from "groq-sdk";

interface Change {
  type: "added" | "removed" | "modified";
  section: string;
  original?: string;
  revised?: string;
  significance: number;
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const { doc1Id, doc2Id } = await request.json();

    if (!doc1Id || !doc2Id) {
      return NextResponse.json(
        { error: "Missing document IDs" },
        { status: 400 }
      );
    }

    const doc1 = await getDocument(doc1Id);
    const doc2 = await getDocument(doc2Id);

    if (!doc1 || !doc2) {
      return NextResponse.json(
        { error: "One or both documents not found" },
        { status: 404 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const systemPrompt = `You are a legal document comparison expert. Compare two versions of a contract and identify substantive changes.

For each change, provide:
1. Type: "added", "removed", or "modified"
2. Section: the clause or section affected
3. Significance (1-10): how important is this change legally/financially?
4. Description: plain English explanation of what changed and why it matters
5. Original: exact quote from original (if applicable)
6. Revised: exact quote from revised (if applicable)

Focus on substantive changes (liability caps changing from 100k to 1M), not rewordings.
Ignore minor formatting or rewording without legal impact.

Output as JSON array of changes.`;

    const userPrompt = `Compare these two contract versions:

=== ORIGINAL ===
${doc1.textContent.substring(0, 4000)}

=== REVISED ===
${doc2.textContent.substring(0, 4000)}

Identify substantive differences and provide JSON response with this structure:
[
  {
    "type": "added|removed|modified",
    "section": "clause name",
    "significance": 1-10,
    "description": "what changed in plain English",
    "original": "quote from original",
    "revised": "quote from revised"
  }
]`;

    const message = await groq.chat.completions.create({
      model: "mixtral-8x7b-32768",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const responseText = message.choices[0]?.message?.content || "";

    let changes: Change[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        changes = parsed.map((c: any) => ({
          type: c.type || "modified",
          section: c.section || "Unknown",
          original: c.original,
          revised: c.revised,
          significance: Math.min(10, Math.max(1, c.significance || 5)),
          description: c.description || "Change detected",
        }));
      }
    } catch (err) {
      console.error("JSON parse failed:", err);
      changes = [
        {
          type: "modified",
          section: "Analysis",
          significance: 5,
          description: responseText,
        },
      ];
    }

    return NextResponse.json({
      changes: changes.sort((a, b) => b.significance - a.significance),
    });
  } catch (err) {
    console.error("Comparison error:", err);
    return NextResponse.json(
      { error: "Comparison failed" },
      { status: 500 }
    );
  }
}
