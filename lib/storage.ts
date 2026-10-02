import { promises as fs } from "fs";
import path from "path";

// Vercel's filesystem is read-only except /tmp
const DATA_DIR = process.env.VERCEL
  ? "/tmp/data"
  : path.join(process.cwd(), "data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const METADATA_DIR = path.join(DATA_DIR, "metadata");

export interface DocumentMetadata {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  fileType: "pdf" | "docx";
  textContent: string;
  fileSize: number;
}

async function ensureDirs() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    await fs.mkdir(METADATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create directories:", err);
  }
}

export async function saveDocument(
  id: string,
  buffer: Buffer,
  originalName: string,
  fileType: "pdf" | "docx",
  textContent: string
): Promise<void> {
  await ensureDirs();

  const filename = `${id}-${originalName}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await fs.writeFile(filepath, buffer);

  const metadata: DocumentMetadata = {
    id,
    filename,
    originalName,
    uploadedAt: new Date().toISOString(),
    fileType,
    textContent,
    fileSize: buffer.length,
  };

  const metaPath = path.join(METADATA_DIR, `${id}.json`);
  await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
}

export async function getDocument(id: string): Promise<DocumentMetadata | null> {
  try {
    const metaPath = path.join(METADATA_DIR, `${id}.json`);
    const data = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function listDocuments(): Promise<DocumentMetadata[]> {
  await ensureDirs();

  try {
    const files = await fs.readdir(METADATA_DIR);
    const docs: DocumentMetadata[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const data = await fs.readFile(path.join(METADATA_DIR, file), "utf-8");
        docs.push(JSON.parse(data));
      }
    }

    return docs.sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function deleteDocument(id: string): Promise<void> {
  const metaPath = path.join(METADATA_DIR, `${id}.json`);
  const meta = await getDocument(id);

  if (meta) {
    const filepath = path.join(UPLOADS_DIR, meta.filename);
    await fs.unlink(filepath).catch(() => {});
    await fs.unlink(metaPath).catch(() => {});
  }
}
