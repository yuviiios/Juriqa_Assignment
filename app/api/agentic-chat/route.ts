import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/storage";
import { verifyQuote } from "@/lib/quoteVerification";
import { executeToolCall } from "@/lib/agentTools";
import Groq from "groq-sdk";

const MODEL = "openai/gpt-oss-20b";
const MAX_ROUNDS = 5;

// Names must match the cases in executeToolCall.
const AGENT_TOOLS: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_document",
      description:
        "Search the document for lines matching a query. Returns up to 5 matching lines.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Text or phrase to search for",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_section",
      description:
        "Get the text of one numbered section of the document, truncated to 2000 characters.",
      parameters: {
        type: "object",
        properties: {
          section_number: {
            type: "integer",
            description: "1-based section number",
          },
        },
        required: ["section_number"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_clauses",
      description:
        "List which standard legal clauses (termination, liability, governing law, etc.) appear in the document.",
      parameters: { type: "object", properties: {} },
    },
  },
];

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

    const encoder = new TextEncoder();
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          const systemPrompt = `You are a legal document research assistant. You have tools to search and analyze a document.

When answering questions:
1. Use the tools to research the document thoroughly
2. Make multiple tool calls if needed to build a complete answer
3. After gathering information, provide a comprehensive answer with quotes from the document
4. Format quotes as [QUOTE]exact text[/QUOTE]

You have a maximum of ${MAX_ROUNDS} research rounds. Use them wisely.`;

          const messages: any[] = [
            { role: "system", content: systemPrompt },
            { role: "user", content: question },
          ];

          const sendAnswer = (answer: string) => {
            const quotes = extractAndVerifyQuotes(answer, doc.textContent);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ answer })}\n\n`)
            );
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, quotes })}\n\n`)
            );
          };

          let answered = false;

          for (let round = 0; round < MAX_ROUNDS && !answered; round++) {
            const response = await groq.chat.completions.create({
              model: MODEL,
              max_tokens: 2048,
              messages,
              tools: AGENT_TOOLS,
              tool_choice: "auto",
            });

            const message = response.choices[0]?.message;
            if (!message) break;

            const toolCalls = message.tool_calls ?? [];

            if (toolCalls.length === 0) {
              sendAnswer(message.content?.trim() || "");
              answered = true;
              break;
            }

            // The assistant turn carrying tool_calls must precede the tool
            // results, and every call needs a matching tool message or the
            // next request is rejected.
            messages.push(message);

            for (const call of toolCalls) {
              const toolName = call.function.name.toLowerCase();

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    progress: `Executing ${toolName}...`,
                  })}\n\n`
                )
              );

              let args: Record<string, unknown> = {};
              let parseError = "";
              try {
                args = call.function.arguments
                  ? JSON.parse(call.function.arguments)
                  : {};
              } catch (err) {
                parseError =
                  err instanceof Error ? err.message : "argument parse error";
              }

              const content = parseError
                ? `Could not parse arguments: ${parseError}`
                : executeToolCall(toolName, args, doc.textContent).result;

              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content,
              });
            }
          }

          if (!answered) {
            // Rounds exhausted mid-research. Ask for a final answer with the
            // tools closed off rather than emitting a placeholder.
            try {
              messages.push({
                role: "user",
                content:
                  "Research budget reached. Do not call any more tools. Answer now using what you have gathered, with [QUOTE] tags.",
              });

              const final = await groq.chat.completions.create({
                model: MODEL,
                max_tokens: 2048,
                messages,
                tools: AGENT_TOOLS,
                tool_choice: "none",
              });

              sendAnswer(final.choices[0]?.message?.content?.trim() || "");
            } catch (err) {
              console.error("Final answer call failed:", err);
              sendAnswer(
                "I reached the research limit before reaching a conclusion. Please narrow the question and try again."
              );
            }
          }

          controller.close();
        } catch (err) {
          console.error("Agentic chat error:", err);
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
    console.error("Agentic chat error:", err);
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
