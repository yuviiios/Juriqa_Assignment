import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/storage";
import { chunkDocument, selectRelevantChunks } from "@/lib/chunks";
import { verifyQuote } from "@/lib/quoteVerification";
import Groq from "groq-sdk";

export async function POST(request: NextRequest) {
  try {
    const { documentIds, question } = await request.json();

    if (!Array.isArray(documentIds) || documentIds.length < 2 || !question) {
      return NextResponse.json(
        { error: "Need at least 2 document IDs and a question" },
        { status: 400 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const docs = await Promise.all(
      documentIds.map((id) => getDocument(id))
    );

    if (docs.some((d) => !d)) {
      return NextResponse.json(
        { error: "One or more documents not found" },
        { status: 404 }
      );
    }

    const docData = docs.map((doc, idx) => ({
      doc: doc!,
      originalName: documentIds[idx],
    }));

    const contextParts = docData.map(({ doc }, idx) => {
      const chunks = chunkDocument(doc.textContent);
      const relevantChunks = selectRelevantChunks(chunks, question, 3);
      return `\n\n=== Document ${idx + 1}: ${doc.originalName} ===\n${relevantChunks.join("\n\n")}`;
    });

    const contextText = contextParts.join("");

    const systemPrompt = `You are a legal document analyst comparing multiple contracts.

When answering:
1. Compare the documents and highlight differences/similarities
2. Include exact quotes from the documents that support your analysis
3. Format quotes as [QUOTE_DOC_X]exact text[/QUOTE_DOC_X] where X is 1, 2, 3, etc.
4. If information is not in the documents, say so
5. Focus on substantive differences, not just rewordings`;

    const userPrompt = `Compare these documents and answer the question:

${contextText}

Question: ${question}

Provide a comparison using quotes from the documents.`;

    const stream = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      max_tokens: 2048,
      stream: true,
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

    const encoder = new TextEncoder();
    let fullText = "";

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: delta })}\n\n`)
              );
            }
          }

          const quotes = extractAndVerifyQuotes(fullText, docData);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, quotes })}\n\n`
            )
          );
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(customStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Multi-chat error:", err);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 500 }
    );
  }
}

function extractAndVerifyQuotes(
  answer: string,
  docData: Array<{ doc: any; originalName: string }>
): Array<{ text: string; verified: boolean; documentId: string; documentName: string }> {
  const quotes: Array<{
    text: string;
    verified: boolean;
    documentId: string;
    documentName: string;
  }> = [];

  for (let i = 0; i < docData.length; i++) {
    const docIdx = i + 1;
    const regex = new RegExp(
      `\\[QUOTE_DOC_${docIdx}\\](.*?)\\[\\/QUOTE_DOC_${docIdx}\\]`,
      "gs"
    );
    let match;

    while ((match = regex.exec(answer)) !== null) {
      const quoteText = match[1].trim();
      const verified = verifyQuote(quoteText, docData[i].doc.textContent);
      quotes.push({
        text: quoteText,
        verified,
        documentId: docData[i].doc.id,
        documentName: docData[i].doc.originalName,
      });
    }
  }

  return quotes;
}
