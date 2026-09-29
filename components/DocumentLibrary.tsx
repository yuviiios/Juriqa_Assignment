"use client";

interface Document {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface DocumentLibraryProps {
  documents: Document[];
  onSelect: (doc: Document) => void;
  onDelete: (docId: string) => void;
}

export default function DocumentLibrary({
  documents,
  onSelect,
  onDelete,
}: DocumentLibraryProps) {
  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-4xl mb-3">📁</p>
        <p className="text-gray-600 font-medium">No documents yet</p>
        <p className="text-sm text-gray-500 mt-1">Upload a contract to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <h2 className="text-xl font-semibold p-6 border-b border-gray-200">
        Document Library
      </h2>

      <div className="divide-y divide-gray-200">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-6 hover:bg-gray-50 transition flex items-center justify-between"
          >
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{doc.filename}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onSelect(doc)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Open
              </button>
              <button
                onClick={async () => {
                  if (confirm("Delete this document?")) {
                    try {
                      await fetch(`/api/documents?id=${doc.id}`, { method: "DELETE" });
                      onDelete(doc.id);
                    } catch (err) {
                      alert("Delete failed");
                    }
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
