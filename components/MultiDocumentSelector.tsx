"use client";

import { useState, useEffect } from "react";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface MultiDocumentSelectorProps {
  documents: Document[];
  onSelect: (selectedIds: string[]) => void;
  onCancel: () => void;
}

export default function MultiDocumentSelector({
  documents,
  onSelect,
  onCancel,
}: MultiDocumentSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleDoc(id: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  }

  function handleSelect() {
    if (selected.size < 2) {
      alert("Select at least 2 documents to compare");
      return;
    }
    onSelect(Array.from(selected));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Select Documents to Compare</h2>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-6">
          {documents.map((doc) => (
            <label key={doc.id} className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(doc.id)}
                onChange={() => toggleDoc(doc.id)}
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{doc.filename}</div>
                <div className="text-sm text-gray-500">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            disabled={selected.size < 2}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 transition"
          >
            Compare ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}
