"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  documentId: string;
  highlightText?: string;
}

interface HighlightBox {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function PDFViewer({ documentId, highlightText }: PDFViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [highlights, setHighlights] = useState<HighlightBox[]>([]);
  const [scale, setScale] = useState(1.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function loadPDF() {
      try {
        const response = await fetch(`/api/pdf/${documentId}`);
        const arrayBuffer = await response.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    }

    loadPDF();
  }, [documentId]);

  useEffect(() => {
    if (!pdfDoc) return;

    async function renderPage() {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });

      if (canvasRef.current) {
        canvasRef.current.width = viewport.width;
        canvasRef.current.height = viewport.height;

        const context = canvasRef.current.getContext("2d");
        if (context) {
          await page.render({
            canvasContext: context,
            viewport,
          }).promise;
        }
      }

      if (highlightText) {
        await findAndHighlightText(page, highlightText, viewport);
      }
    }

    renderPage();
  }, [pdfDoc, currentPage, scale, highlightText]);

  async function findAndHighlightText(
    page: any,
    searchText: string,
    viewport: any
  ) {
    const textContent = await page.getTextContent();
    const items = textContent.items as Array<any>;

    const normalizedSearch = searchText.toLowerCase().trim();
    let pageText = "";
    const positions: Array<{ start: number; end: number; item: any }> = [];

    items.forEach((item) => {
      const startPos = pageText.length;
      if ("str" in item) {
        pageText += item.str;
        positions.push({
          start: startPos,
          end: pageText.length,
          item,
        });
      }
    });

    const normalizedPageText = pageText.toLowerCase();
    const matchIndex = normalizedPageText.indexOf(normalizedSearch);

    if (matchIndex === -1) {
      setHighlights([]);
      return;
    }

    const matchedItems = positions.filter(
      (p) => p.start <= matchIndex && p.end > matchIndex
    );

    const boxes: HighlightBox[] = matchedItems.map((p) => ({
      page: currentPage,
      x: p.item.transform[4],
      y: p.item.transform[5],
      width: p.item.width,
      height: p.item.height,
    }));

    setHighlights(boxes);

    if (highlightCanvasRef.current) {
      const ctx = highlightCanvasRef.current.getContext("2d");
      if (ctx) {
        highlightCanvasRef.current.width = viewport.width;
        highlightCanvasRef.current.height = viewport.height;

        ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
        boxes.forEach((box) => {
          ctx.fillRect(box.x * scale, box.y * scale, box.width * scale, box.height * scale);
        });
      }
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.2))}
            className="px-2 py-1 bg-gray-200 rounded text-sm"
          >
            −
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale(Math.min(3, scale + 0.2))}
            className="px-2 py-1 bg-gray-200 rounded text-sm"
          >
            +
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center relative"
      >
        {pdfDoc ? (
          <div className="relative">
            <canvas ref={canvasRef} className="bg-white shadow-lg" />
            {highlights.length > 0 && (
              <canvas
                ref={highlightCanvasRef}
                className="absolute top-0 left-0"
              />
            )}
          </div>
        ) : (
          <div className="text-gray-500">Loading PDF...</div>
        )}
      </div>
    </div>
  );
}
