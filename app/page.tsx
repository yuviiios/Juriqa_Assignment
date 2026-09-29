"use client";

import { useState, useEffect } from "react";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentLibrary from "@/components/DocumentLibrary";
import ChatInterface from "@/components/ChatInterface";
import PDFViewer from "@/components/PDFViewer";
import MultiDocumentSelector from "@/components/MultiDocumentSelector";
import MultiDocumentChat from "@/components/MultiDocumentChat";
import ComparisonSelector from "@/components/ComparisonSelector";
import ComparisonView from "@/components/ComparisonView";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

type ViewMode = "library" | "chat" | "multi-chat" | "multi-select" | "compare-select" | "comparing";

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);
  const [comparisonDocs, setComparisonDocs] = useState<{
    doc1: Document | null;
    doc2: Document | null;
  }>({ doc1: null, doc2: null });
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

  function handleCompare(doc1Id: string, doc2Id: string) {
    const doc1 = documents.find((d) => d.id === doc1Id);
    const doc2 = documents.find((d) => d.id === doc2Id);
    if (doc1 && doc2) {
      setComparisonDocs({ doc1, doc2 });
      setView("comparing");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {view === "library"
              ? "Contract Analyzer"
              : view === "multi-chat"
              ? "Compare Contracts (Q&A)"
              : view === "comparing"
              ? "Compare Contracts (Diff)"
              : selectedDoc?.filename}
          </h1>
          {(view === "chat" || view === "multi-chat" || view === "comparing") && (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <DocumentLibrary
                  documents={documents}
                  onSelect={handleSelectDoc}
                  onDelete={handleDeleteDoc}
                />
              </div>
              {documents.length >= 2 && (
                <div className="space-y-4">
                  <button
                    onClick={() => setView("multi-select")}
                    className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Q&A: Multiple Docs
                  </button>
                  <button
                    onClick={() => setView("compare-select")}
                    className="w-full px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                  >
                    Compare: Two Versions
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : view === "multi-select" ? (
          <MultiDocumentSelector
            documents={documents}
            onSelect={handleMultiSelect}
            onCancel={() => setView("library")}
          />
        ) : view === "compare-select" ? (
          <ComparisonSelector
            documents={documents}
            onCompare={handleCompare}
            onCancel={() => setView("library")}
          />
        ) : view === "multi-chat" ? (
          <div className="p-4 h-full">
            <MultiDocumentChat
              documents={selectedDocs}
              onBack={() => setView("library")}
            />
          </div>
        ) : view === "comparing" && comparisonDocs.doc1 && comparisonDocs.doc2 ? (
          <div className="p-4 h-full">
            <ComparisonView
              doc1={comparisonDocs.doc1}
              doc2={comparisonDocs.doc2}
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
