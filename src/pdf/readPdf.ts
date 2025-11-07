import fs from 'node:fs';
import crypto from 'node:crypto';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - pdf-parse has no types in this environment
import pdfParse from 'pdf-parse';

export type PdfReadResult = {
  sha256: string;
  pageCount: number;
  pages: string[]; // page texts in order
};

export async function readPdfPerPage(filePath: string): Promise<PdfReadResult> {
  const buffer = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const data = await pdfParse(buffer);
  const rawText: string = data.text ?? '';
  const pages = rawText.split('\f').map((s: string) => s.trim());
  return {
    sha256,
    pageCount: data.numpages ?? pages.length,
    pages,
  };
}


