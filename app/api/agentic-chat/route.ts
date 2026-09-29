import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/lib/storage";
import { verifyQuote } from "@/lib/quoteVerification";
import { executeToolCall } from "@/lib/agentTools";
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

    const encoder = new TextEncoder();
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          const systemPrompt = `You are a legal document research assistant. You have access to tools to search and analyze a document.

Available tools:
1. search_document(query: string) - Search for text matching a query
2. get_section(section_number: int) - Get a specific section of the document
3. list_clauses() - List all identified clauses in the document

When answering questions:
1. Use the tools to research the document thoroughly
2. Make multiple tool calls if needed to build a complete answer
3. After gathering information, provide a comprehensive answer with quotes from the document
4. Format quotes as [QUOTE]exact text[/QUOTE]

You have a maximum of 5 tool calls. Use them wisely.`;

          const messages: any[] = [
            {
              role: "user",
              content: systemPrompt + "\n\nNow, answer this question: " + question,
            },
          ];

          let roundCount = 0;
          const maxRounds = 5;
          let toolsUsed = 0;

          while (roundCount < maxRounds) {
            roundCount++;

            const response = await groq.chat.completions.create({
              model: "mixtral-8x7b-32768",
              max_tokens: 2048,
              messages: messages,
            });

            const assistantMessage = response.choices[0]?.message?.content || "";

            if (!assistantMessage) {
              break;
            }

            const toolCallRegex = /\[TOOL\]([\s\S]*?)\[\/TOOL\]/g;
            let toolCallMatch;
            let hasToolCalls = false;
            const toolResults: string[] = [];

            while ((toolCallMatch = toolCallRegex.exec(assistantMessage)) !== null) {
              hasToolCalls = true;
              toolsUsed++;

              if (toolsUsed > 5) {
                break;
              }

              const toolCall = toolCallMatch[1].trim();

              try {
                const toolMatch = toolCall.match(/^(\w+)\((.+)\)$/);
                if (!toolMatch) {
                  toolResults.push(`Invalid tool call format: ${toolCall}`);
                  continue;
                }

                const [, toolName, argsStr] = toolMatch;
                const args = JSON.parse(argsStr);

                const toolName_lower = toolName.toLowerCase();
                const validTools = [
                  "search_document",
                  "get_section",
                  "list_clauses",
                ];

                if (!validTools.includes(toolName_lower)) {
                  toolResults.push(`Unknown tool: ${toolName}`);
                  continue;
                }

                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      progress: `Executing ${toolName}...`,
                    })}\n\n`
                  )
                );

                const result = executeToolCall(toolName_lower, args, doc.textContent);
                toolResults.push(`${result.toolName}: ${result.result}`);
              } catch (err) {
                const errMsg =
                  err instanceof Error ? err.message : "Parse error";
                toolResults.push(`Tool error: ${errMsg}`);
              }
            }

            if (!hasToolCalls) {
              const quotes = extractAndVerifyQuotes(assistantMessage, doc.textContent);
              const cleanAnswer = assistantMessage
                .replace(/\[TOOL\][\s\S]*?\[\/TOOL\]/g, "")
                .trim();

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    answer: cleanAnswer,
                  })}\n\n`
                )
              );

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    done: true,
                    quotes,
                  })}\n\n`
                )
              );

              break;
            }

            messages.push({
              role: "assistant",
              content: assistantMessage,
            });

            messages.push({
              role: "user",
              content: `Tool results:\n${toolResults.join("\n")}`,
            });
          }

          if (roundCount >= maxRounds) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  answer:
                    "Maximum research rounds reached. Based on my search:\n\n(Please see above for findings)",
                })}\n\n`
              )
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  quotes: [],
                })}\n\n`
              )
            );
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
