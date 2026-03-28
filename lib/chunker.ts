
import pdfParse from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import { DocumentChunk } from './types';

export interface ParsedDocument {
  name: string;
  documentId: string;
  pages: string[];
  chunks: DocumentChunk[];
  pageCount: number;
}

const CHUNK_SIZE = 800;        // characters per chunk
const CHUNK_OVERLAP = 150;     // overlap between chunks for context continuity

function chunkText(
  text: string,
  chunkSize: number = CHUNK_SIZE,
  overlap: number = CHUNK_OVERLAP
): string[] {
  const chunks: string[] = [];
  
  // Split on sentence boundaries for more natural chunks
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  let overlapBuffer = '';
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep last portion as overlap for next chunk
      const words = currentChunk.split(' ');
      overlapBuffer = words.slice(-Math.floor(overlap / 6)).join(' ');
      currentChunk = overlapBuffer + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  
  if (currentChunk.trim().length > 50) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function parsePDF(
  buffer: Buffer,
  fileName: string,
  sessionId: string
): Promise<ParsedDocument> {
  const documentId = uuidv4();
  
  // pdf-parse extracts text per page
  const parsed = await pdfParse(buffer, {
    // Extract page text
    pagerender: function(pageData: { getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[] }> }> }) {
      return pageData.getTextContent().then(function(textContent: { items: Array<{ str: string; transform: number[] }> }) {
        let lastY = -1;
        let text = '';
        for (const item of textContent.items) {
          if (lastY !== item.transform[5] && lastY !== -1) {
            text += '\n';
          }
          text += item.str;
          lastY = item.transform[5];
        }
        return text;
      });
    }
  });

  const fullText = parsed.text;
  const pageCount = parsed.numpages;
  
  // Split text into approximate page segments
  const textPerPage = Math.ceil(fullText.length / pageCount);
  const pages: string[] = [];
  
  for (let i = 0; i < pageCount; i++) {
    const pageText = fullText.slice(i * textPerPage, (i + 1) * textPerPage);
    pages.push(pageText.trim());
  }
  
  // Generate chunks across all pages with page attribution
  const chunks: DocumentChunk[] = [];
  let globalChunkIndex = 0;
  
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageText = pages[pageIdx];
    if (!pageText || pageText.length < 20) continue;
    
    const pageChunks = chunkText(pageText);
    
    for (const chunkText_ of pageChunks) {
      if (chunkText_.length < 30) continue;
      
      chunks.push({
        id: `${documentId}-chunk-${globalChunkIndex}`,
        text: chunkText_,
        metadata: {
          documentName: fileName,
          documentId,
          pageNumber: pageIdx + 1,
          chunkIndex: globalChunkIndex,
          totalChunks: 0, // filled after
          sessionId,
        },
      });
      globalChunkIndex++;
    }
  }
  
  // Update totalChunks
  chunks.forEach((chunk) => {
    chunk.metadata.totalChunks = chunks.length;
  });
  
  return {
    name: fileName,
    documentId,
    pages,
    chunks,
    pageCount,
  };
}

export function extractSectionHeader(text: string): string {
  // Try to find a heading-like structure at the start of the chunk
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const firstLine = lines[0]?.trim() || '';
  
  // Heuristic: if first line is short and title-case-ish, it's a header
  if (firstLine.length < 80 && firstLine.length > 5) {
    const words = firstLine.split(' ');
    const capitalizedRatio = words.filter((w) => w[0] === w[0]?.toUpperCase()).length / words.length;
    if (capitalizedRatio > 0.5) {
      return firstLine;
    }
  }
  
  // Otherwise return truncated first sentence
  return firstLine.slice(0, 60) + (firstLine.length > 60 ? '...' : '');
}