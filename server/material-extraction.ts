import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MAX_CONTENT_CHARS = 60_000;

export type MaterialUpload = {
  fileName: string;
  mimeType?: string;
  base64: string;
};

function normalizeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r\n/g, "\n").trim();
}

export async function extractTeachingText(upload: MaterialUpload) {
  const bytes = Buffer.from(upload.base64, "base64");
  if (bytes.length === 0) throw new Error("The uploaded file is empty.");
  if (bytes.length > 5 * 1024 * 1024) throw new Error("Files must be 5MB or smaller.");

  const extension = upload.fileName.split(".").pop()?.toLowerCase();
  let text = "";

  if (extension === "txt" || upload.mimeType === "text/plain") {
    text = bytes.toString("utf8");
  } else if (extension === "pdf" || upload.mimeType === "application/pdf") {
    const parser = new PDFParse({ data: bytes });
    try {
      const result = await parser.getText();
      text = result.text;
    } finally {
      await parser.destroy();
    }
  } else if (
    extension === "docx" ||
    upload.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: bytes });
    text = result.value;
  } else {
    throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
  }

  const normalized = normalizeText(text);
  if (normalized.length < 40) {
    throw new Error("Praxis could not find enough readable teaching text in that file.");
  }
  return normalized.slice(0, MAX_CONTENT_CHARS);
}

export function normalizePastedTeachingText(text: string) {
  const normalized = normalizeText(text);
  if (normalized.length < 40) {
    throw new Error("Add at least a few sentences so Praxis can identify teaching patterns.");
  }
  return normalized.slice(0, MAX_CONTENT_CHARS);
}
