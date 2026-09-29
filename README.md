# Contract Analyzer

AI-powered legal contract analysis tool. Upload documents, ask questions, get verified answers with exact quotes from the text.

## Features

### Part A: Core Features
- **Document Upload**: Accept PDF and DOCX files with text extraction
- **Chat Interface**: Ask questions about uploaded contracts
- **Quote Verification**: All answers backed by verified quotes from the document
- **Streaming Responses**: Answers appear token-by-token as they're generated
- **Large Document Support**: Handles 150+ page contracts efficiently via chunking

### Part B: Advanced Features
- **Citation Highlighting**: Click a quote to jump to and highlight the passage in the PDF viewer
- **Multi-Document Q&A**: Ask comparative questions across multiple documents at once
- **Document Comparison**: Upload two versions and get a semantic diff showing what changed substantively
- **Significance Scoring**: Changes ranked by legal/financial impact (1-10 scale) with filtering

### Part C: Agentic Research
- **Autonomous Tool-Calling**: The AI uses tools to research documents independently
  - `search_document(query)`: Search for matching passages
  - `get_section(number)`: Retrieve a specific section
  - `list_clauses()`: Identify standard contract clauses
- **Multi-Round Reasoning**: Up to 5 rounds of tool calls per question
- **Live Progress Display**: Watch as the AI searches and analyzes

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **PDF**: pdfjs-dist (rendering + text extraction)
- **DOCX**: mammoth (text extraction)
- **LLM**: Groq (Mixtral 8x7B) - free tier
- **Storage**: Filesystem-based with JSON metadata

## Getting Started

### Prerequisites
- Node.js 18+
- Groq API key (free: groq.com)

### Installation

```bash
npm install
```

### Configuration

Create `.env.local`:
```env
GROQ_API_KEY=your_groq_api_key
```

### Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

### Build

```bash
npm run build
npm start
```

## Usage

### 1. Standard Chat
- Upload → Open document → Ask question → Get answer with verified quotes
- Click quote to highlight in PDF viewer

### 2. Multi-Document Q&A
- Select 2+ docs → "Q&A: Multiple Docs" → Ask comparative question
- Quotes labeled with source document

### 3. Document Comparison
- Select 2 docs → "Compare: Two Versions" → See semantic diff
- Filter by significance level (what changed matters, not just rewordings)

### 4. Agentic Research
- Open document → "🔬 Agentic Research" → Ask complex question
- Watch AI call tools autonomously, reasoning shown in real-time

## Quote Verification

**How It Works**:
1. LLM returns answer with quotes in `[QUOTE]text[/QUOTE]` format
2. Backend extracts and normalizes quote (collapses whitespace)
3. Searches for normalized text in document
4. Only shows quote if found (marked "✓ Verified")
5. If not found: marked "⚠ Unverified" or removed

**Where It Could Fail**:
- Scanned PDF with poor OCR (character errors prevent matching)
- Text extraction artifacts (extra spaces/line breaks)
- Unicode/encoding issues
- LLM heavily paraphrases (by design—we catch this)

## Large Documents

For docs > 8K tokens:
1. Split into overlapping chunks (8K tokens, 500 token overlap)
2. For each question, retrieve 5 most relevant chunks
3. Send only relevant chunks to LLM
4. Prevents hallucination about unseen sections

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/upload` | Upload document |
| GET | `/api/documents` | List documents |
| DELETE | `/api/documents?id=...` | Delete document |
| POST | `/api/chat` | Chat single document |
| POST | `/api/multi-chat` | Chat multiple documents |
| POST | `/api/compare` | Compare two documents |
| POST | `/api/agentic-chat` | Agentic research |
| GET | `/api/pdf/[id]` | Serve PDF |

## What's Done

✅ Upload PDF + DOCX  
✅ Quote verification  
✅ Streaming chat with stop button  
✅ PDF citation highlighting  
✅ Multi-document Q&A  
✅ Semantic document comparison  
✅ Agentic research with tool-calling  
✅ Error handling + loading states  
✅ Responsive UI  

## What's Not Done

❌ Chat history persistence  
❌ DOCX citation highlighting  
❌ Scanned PDF detection  
❌ Arabic/RTL support  
❌ Anonymization  
❌ Semantic embeddings  
❌ Export as PDF/Word  

## Part C: Agentic Research

**Chosen**: Agentic tool-calling (not redlining)

**Why**: Lower risk, cleaner outcome, visible reasoning, better for analysis

**How**: LLM calls tools autonomously → max 5 rounds → progress shown → final answer with verified quotes

## Deployment

Ready for Vercel/Railway/Render

```bash
npm run build
# Deploy to Vercel via GitHub integration or CLI
```

## Performance

- First request: ~3-5s (LLM init)
- Streaming starts: ~2s
- Multi-doc comparison: ~5-10s
- PDF rendering: smooth to ~100 pages

## Known Issues

- Large PDFs (500+) may timeout
- Scanned PDFs may have extraction errors
- Mobile layout basic (not fully responsive)
- Quote verification fails on tables with complex formatting

## Future Work

1. Persist chat history
2. DOCX highlighting
3. Redlining with tracked changes
4. Semantic search (embeddings)
5. Better OCR handling
6. Export with quotes
7. Multi-language support

---

Built with Next.js + Groq LLM
