import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/storage";
import { chunkDocument, selectRelevantChunks } from "@/lib/chunks";
import { verifyQuote } from "@/lib/quoteVerification";
import Groq from "groq-sdk";

export async function POST(request: NextRequest) {
  try {
    const { documentId, question } = await request.json();

    if (!documentId || !question) {
      return NextResponse.json(
        { error: "Missing documentId or question" },
        { status: 400 }
      );
    }

    const doc = await getDocument(documentId);
    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const chunks = chunkDocument(doc.textContent);
    const relevantChunks = selectRelevantChunks(chunks, question, 5);
    const contextText = relevantChunks.join("\n\n---\n\n");

    const systemPrompt = `You are a legal document analyst. Answer questions about the provided document using ONLY information from the document.

When answering:
1. Base your answer entirely on the document text provided
2. Include exact quotes from the document that support your answer
3. Format quotes as [QUOTE]exact text from document[/QUOTE]
4. If the answer is not in the document, say "I cannot find this information in the document"

Be precise and cite your sources with exact quotes.`;

    const userPrompt = `Document text:

${contextText}

Question: ${question}

Please answer the question using only the document provided, with exact quotes in [QUOTE] tags.`;

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

    const fullAnswer = message.choices[0]?.message?.content || "";

    const quotes = extractAndVerifyQuotes(fullAnswer, doc.textContent);

    return NextResponse.json({
      answer: fullAnswer,
      quotes,
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Chat request failed" },
      { status: 500 }
    );
  }
}

function extractAndVerifyQuotes(
  answer: string,
  documentText: string
): Array<{ text: string; verified: boolean }> {
  const regex = /\[QUOTE\](.*?)\[\/QUOTE\]/gs;
  const quotes: Array<{ text: string; verified: boolean }> = [];
  let match;

  while ((match = regex.exec(answer)) !== null) {
    const quoteText = match[1].trim();
    const verified = verifyQuote(quoteText, documentText);
    quotes.push({ text: quoteText, verified });
  }

  return quotes;
}
