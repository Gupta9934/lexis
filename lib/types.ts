
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    documentName: string;
    documentId: string;
    pageNumber: number;
    chunkIndex: number;
    totalChunks: number;
    sessionId: string;
  };
  embedding?: number[];
}

export interface Citation {
  documentName: string;
  pageNumber: number;
  section: string;
  relevanceScore: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  usedWebSearch?: boolean;
  webSearchQuery?: string;
  subQuestions?: string[];
  timestamp: Date;
  status?: 'thinking' | 'retrieving' | 'generating' | 'done' | 'error';
}

export interface UploadedDocument {
  id: string;
  name: string;
  pageCount: number;
  chunkCount: number;
  uploadedAt: Date;
  size: number;
}

export interface RAGContext {
  chunks: DocumentChunk[];
  citations: Citation[];
  confidence: number;
}

export interface AgentResponse {
  answer: string;
  citations: Citation[];
  usedWebSearch: boolean;
  webSearchQuery?: string;
  subQuestions?: string[];
  confidence: number;
}