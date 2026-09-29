"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Served from public/, kept in sync by the "sync-pdf-worker" npm script.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: any = null;

    async function loadPDF() {
      try {
        const response = await fetch(`/api/pdf/${documentId}`);
        const arrayBuffer = await response.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        loaded = doc;
        if (cancelled) {
          doc.destroy();
          return;
        }
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (!cancelled) console.error("Failed to load PDF:", err);
      }
    }

    loadPDF();

    return () => {
      cancelled = true;
      loaded?.destroy();
    };
  }, [documentId]);

  useEffect(() => {
    if (!pdfDoc) return;

    let cancelled = false;

    async function renderPage() {
      const page = await pdfDoc.getPage(currentPage);
      if (cancelled) return;

      const viewport = page.getViewport({ scale });

      if (canvasRef.current) {
        canvasRef.current.width = viewport.width;
        canvasRef.current.height = viewport.height;

        const context = canvasRef.current.getContext("2d");
        if (context) {
          // A canvas can only run one render() at a time. Page/scale changes
          // land faster than a render completes, so drop the in-flight one.
          renderTaskRef.current?.cancel();
          const task = page.render({ canvasContext: context, viewport });
          renderTaskRef.current = task;

          try {
            await task.promise;
          } catch (err: any) {
            if (err?.name === "RenderingCancelledException") return;
            throw err;
          } finally {
            if (renderTaskRef.current === task) renderTaskRef.current = null;
          }
        }
      }

      if (cancelled) return;

      if (highlightText) {
        await findAndHighlightText(page, highlightText, viewport);
      } else {
        setHighlights([]);
      }
    }

    renderPage().catch((err) => {
      console.error("Failed to render page:", err);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
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
      drawHighlights([], viewport);
      return;
    }

    // Every item the match overlaps, not just the one it starts in — a quote
    // usually spans several text items.
    const matchEnd = matchIndex + normalizedSearch.length;
    const matchedItems = positions.filter(
      (p) => p.start < matchEnd && p.end > matchIndex
    );

    const boxes: HighlightBox[] = matchedItems.map((p) => {
      // transform[4]/[5] are PDF-space, y-up from the bottom-left. The viewport
      // transform flips that into canvas space and applies the scale.
      const [x, baselineY] = pdfjsLib.Util.applyTransform(
        [p.item.transform[4], p.item.transform[5]],
        viewport.transform
      );
      const height = p.item.height * scale;

      return {
        page: currentPage,
        x,
        y: baselineY - height,
        width: p.item.width * scale,
        height,
      };
    });

    setHighlights(boxes);
    drawHighlights(boxes, viewport);
  }

  function drawHighlights(boxes: HighlightBox[], viewport: any) {
    const canvas = highlightCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
    boxes.forEach((box) => {
      ctx.fillRect(box.x, box.y, box.width, box.height);
    });
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
            {/* Always mounted: findAndHighlightText draws through this ref in
                the same pass that sets `highlights`, so it cannot be gated on
                highlights being non-empty. */}
            <canvas
              ref={highlightCanvasRef}
              className="absolute top-0 left-0 pointer-events-none"
            />
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-600">Loading PDF...</p>
          </div>
        )}
      </div>
    </div>
  );
}
