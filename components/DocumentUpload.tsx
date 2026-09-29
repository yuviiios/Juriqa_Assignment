"use client";

import { useState } from "react";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface DocumentUploadProps {
  onUpload: (doc: Document) => void;
}

export default function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!validTypes.includes(file.type)) {
      setError("Only PDF and DOCX files are accepted");
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const doc = await res.json();
      onUpload(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Upload Document</h2>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileChange}
          disabled={loading}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer block">
          <p className="text-gray-600">
            {loading ? "Uploading..." : "Drag and drop or click to upload"}
          </p>
          <p className="text-sm text-gray-500 mt-1">PDF or DOCX only</p>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
