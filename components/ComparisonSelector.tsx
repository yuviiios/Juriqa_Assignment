"use client";

import { useState } from "react";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface ComparisonSelectorProps {
  documents: Document[];
  onCompare: (doc1Id: string, doc2Id: string) => void;
  onCancel: () => void;
}

export default function ComparisonSelector({
  documents,
  onCompare,
  onCancel,
}: ComparisonSelectorProps) {
  const [doc1, setDoc1] = useState<string>("");
  const [doc2, setDoc2] = useState<string>("");

  function handleCompare() {
    if (!doc1 || !doc2 || doc1 === doc2) {
      alert("Select two different documents");
      return;
    }
    onCompare(doc1, doc2);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-6">Compare Two Documents</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Original Document
            </label>
            <select
              value={doc1}
              onChange={(e) => setDoc1(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select document...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revised Document
            </label>
            <select
              value={doc2}
              onChange={(e) => setDoc2(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select document...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.filename}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCompare}
            disabled={!doc1 || !doc2 || doc1 === doc2}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 transition"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
