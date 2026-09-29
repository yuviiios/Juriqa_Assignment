"use client";

import { useState, useEffect } from "react";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentLibrary from "@/components/DocumentLibrary";
import ChatInterface from "@/components/ChatInterface";
import PDFViewer from "@/components/PDFViewer";
import MultiDocumentSelector from "@/components/MultiDocumentSelector";
import MultiDocumentChat from "@/components/MultiDocumentChat";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

type ViewMode = "library" | "chat" | "multi-chat" | "multi-select";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);
  const [view, setView] = useState<ViewMode>("library");
  const [highlightText, setHighlightText] = useState<string>("");

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const docs = await res.json();
      setDocuments(docs);
    }
  }

  function handleUpload(doc: Document) {
    setDocuments([...documents, doc]);
    setSelectedDoc(doc);
    setView("chat");
  }

  function handleDeleteDoc(docId: string) {
    setDocuments(documents.filter((d) => d.id !== docId));
    if (selectedDoc?.id === docId) {
      setSelectedDoc(null);
      setView("library");
    }
  }

  function handleSelectDoc(doc: Document) {
    setSelectedDoc(doc);
    setView("chat");
  }

  function handleQuoteClick(quote: string) {
    setHighlightText(quote);
  }

  function handleMultiSelect(docIds: string[]) {
    const selected = documents.filter((d) => docIds.includes(d.id));
    setSelectedDocs(selected);
    setView("multi-chat");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {view === "library"
              ? "Contract Analyzer"
              : view === "multi-chat"
              ? "Compare Contracts"
              : selectedDoc?.filename}
          </h1>
          {(view === "chat" || view === "multi-chat") && (
            <button
              onClick={() => setView("library")}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to library
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {view === "library" ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <DocumentUpload onUpload={handleUpload} />
            <div className="flex gap-4 items-center">
              <DocumentLibrary
                documents={documents}
                onSelect={handleSelectDoc}
                onDelete={handleDeleteDoc}
              />
              {documents.length >= 2 && (
                <button
                  onClick={() => setView("multi-select")}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition whitespace-nowrap"
                >
                  Compare Documents
                </button>
              )}
            </div>
          </div>
        ) : view === "multi-select" ? (
          <MultiDocumentSelector
            documents={documents}
            onSelect={handleMultiSelect}
            onCancel={() => setView("library")}
          />
        ) : view === "multi-chat" ? (
          <div className="p-4 h-full">
            <MultiDocumentChat
              documents={selectedDocs}
              onBack={() => setView("library")}
            />
          </div>
        ) : selectedDoc ? (
          <div className="flex h-full gap-4 p-4">
            <div className="flex-1 min-w-0">
              <PDFViewer
                documentId={selectedDoc.id}
                highlightText={highlightText}
              />
            </div>
            <div className="w-96 min-w-0">
              <ChatInterface
                document={selectedDoc}
                onQuoteClick={handleQuoteClick}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
