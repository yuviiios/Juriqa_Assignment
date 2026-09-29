"use client";

import { useState, useEffect } from "react";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface Change {
  type: "added" | "removed" | "modified";
  section: string;
  original?: string;
  revised?: string;
  significance: number;
  description: string;
}

interface ComparisonViewProps {
  doc1: Document;
  doc2: Document;
  onBack: () => void;
}

export default function ComparisonView({ doc1, doc2, onBack }: ComparisonViewProps) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);
  const [minSignificance, setMinSignificance] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComparison();
  }, [doc1.id, doc2.id]);

  async function fetchComparison() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc1Id: doc1.id,
          doc2Id: doc2.id,
        }),
      });

      if (!res.ok) {
        throw new Error("Comparison failed");
      }

      const data = await res.json();
      setChanges(data.changes);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const filteredChanges = changes.filter((c) => c.significance >= minSignificance);

  const stats = {
    added: changes.filter((c) => c.type === "added").length,
    removed: changes.filter((c) => c.type === "removed").length,
    modified: changes.filter((c) => c.type === "modified").length,
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Document Comparison</h2>
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800">
            ← Back
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium text-gray-700">Original</div>
            <div className="text-sm text-gray-600">{doc1.filename}</div>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <div className="text-sm font-medium text-gray-700">Revised</div>
            <div className="text-sm text-gray-600">{doc2.filename}</div>
          </div>
        </div>

        {!loading && (
          <div className="flex gap-4 text-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                {stats.removed}
              </span>
              <span className="text-gray-600">Removed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                {stats.modified}
              </span>
              <span className="text-gray-600">Modified</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                {stats.added}
              </span>
              <span className="text-gray-600">Added</span>
            </div>
          </div>
        )}

        {!loading && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-700">Filter by significance:</label>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={minSignificance}
              onChange={(e) => setMinSignificance(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-600 w-8">{minSignificance}+</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Analyzing documents for differences...</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
            Error: {error}
          </div>
        )}

        {!loading && !error && filteredChanges.length === 0 && (
          <div className="text-center text-gray-500 py-8">No significant changes found</div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {filteredChanges.map((change, idx) => (
              <div
                key={idx}
                className={`p-4 rounded border-l-4 ${
                  change.type === "added"
                    ? "bg-green-50 border-green-400"
                    : change.type === "removed"
                    ? "bg-red-50 border-red-400"
                    : "bg-yellow-50 border-yellow-400"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold mr-2 ${
                        change.type === "added"
                          ? "bg-green-200 text-green-800"
                          : change.type === "removed"
                          ? "bg-red-200 text-red-800"
                          : "bg-yellow-200 text-yellow-800"
                      }`}
                    >
                      {change.type.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {change.section}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-4 mr-0.5 rounded-sm ${
                            i < change.significance
                              ? "bg-orange-500"
                              : "bg-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600 ml-2 w-8">
                      {change.significance}/10
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-3">{change.description}</p>

                {change.original && (
                  <div className="mb-2 p-2 bg-red-100 rounded text-sm">
                    <span className="font-semibold text-red-900">Original:</span>
                    <div className="text-red-800 mt-1 italic">
                      &ldquo;{change.original}&rdquo;
                    </div>
                  </div>
                )}

                {change.revised && (
                  <div className="p-2 bg-green-100 rounded text-sm">
                    <span className="font-semibold text-green-900">Revised:</span>
                    <div className="text-green-800 mt-1 italic">
                      &ldquo;{change.revised}&rdquo;
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
