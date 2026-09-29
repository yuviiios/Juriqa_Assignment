"use client";

import { useState, useEffect } from "react";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentLibrary from "@/components/DocumentLibrary";
import ChatInterface from "@/components/ChatInterface";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [view, setView] = useState<"library" | "chat">("library");

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {view === "library" ? "Contract Analyzer" : selectedDoc?.filename}
          </h1>
          {view === "chat" && (
            <button
              onClick={() => setView("library")}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to library
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === "library" ? (
          <div className="space-y-8">
            <DocumentUpload onUpload={handleUpload} />
            <DocumentLibrary
              documents={documents}
              onSelect={handleSelectDoc}
              onDelete={handleDeleteDoc}
            />
          </div>
        ) : selectedDoc ? (
          <ChatInterface document={selectedDoc} />
        ) : null}
      </main>
    </div>
  );
}
