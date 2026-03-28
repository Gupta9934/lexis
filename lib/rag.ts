
import { generateEmbedding, generateAnswer } from './gemini';
import { queryVectors } from './pinecone';
import { extractSectionHeader } from './chunker';
import { Citation, RAGContext, ChatMessage } from './types';

export async function retrieveContext(
  question: string,
  sessionId: string,
  topK: number = 6
): Promise<RAGContext> {
  // Generate embedding for the question
  const questionEmbedding = await generateEmbedding(question);
  
  // Query Pinecone
  const matches = await queryVectors(questionEmbedding, sessionId, topK);
  
  if (matches.length === 0) {
    return { chunks: [], citations: [], confidence: 0 };
  }
  
  // Convert matches to chunks and citations
  const chunks = matches.map((match) => ({
    id: match.id,
    text: (match.metadata?.text as string) || '',
    metadata: {
      documentName: (match.metadata?.documentName as string) || 'Unknown',
      documentId: (match.metadata?.documentId as string) || '',
      pageNumber: (match.metadata?.pageNumber as number) || 1,
      chunkIndex: (match.metadata?.chunkIndex as number) || 0,
      totalChunks: (match.metadata?.totalChunks as number) || 1,
      sessionId,
    },
  }));
  
  // Build human-friendly citations (deduplicated by document + page)
  const citationMap = new Map<string, Citation>();
  
  for (const match of matches) {
    const docName = (match.metadata?.documentName as string) || 'Unknown';
    const pageNum = (match.metadata?.pageNumber as number) || 1;
    const text = (match.metadata?.text as string) || '';
    const key = `${docName}-p${pageNum}`;
    
    if (!citationMap.has(key)) {
      citationMap.set(key, {
        documentName: docName,
        pageNumber: pageNum,
        section: extractSectionHeader(text),
        relevanceScore: match.score || 0,
        snippet: text.slice(0, 200) + (text.length > 200 ? '...' : ''),
      });
    }
  }
  
  const citations = Array.from(citationMap.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Calculate confidence: avg of top match scores
  const avgScore = matches.slice(0, 3).reduce((sum, m) => sum + (m.score || 0), 0) / 
    Math.min(3, matches.length);
  
  return {
    chunks,
    citations,
    confidence: avgScore,
  };
}

export async function buildRAGPrompt(
  context: RAGContext,
  documentNames: string[]
): Promise<string> {
  const contextText = context.chunks
    .map((chunk, idx) => 
      `[Source ${idx + 1}: ${chunk.metadata.documentName}, Page ${chunk.metadata.pageNumber}]\n${chunk.text}`
    )
    .join('\n\n---\n\n');
  
  return `You are LEXIS, an elite research assistant with exceptional analytical capabilities. You help users understand their documents with precision and depth.

UPLOADED DOCUMENTS: ${documentNames.join(', ')}

RETRIEVED CONTEXT:
${contextText}

INSTRUCTIONS:
1. Answer ONLY using the provided context above. Be precise and thorough.
2. Cite sources naturally in your response using the format [Doc Name, Page X].
3. If the context doesn't fully answer the question, explicitly state what is missing.
4. Structure long answers with clear headings (use **bold** for emphasis).
5. Be analytical, not just descriptive — synthesize information across sources.
6. Confidence in your answer should match what the documents actually say.

TONE: Expert, clear, and insightful. Like a senior analyst who has read these documents thoroughly.`;
}

export async function answerWithRAG(
  question: string,
  context: RAGContext,
  conversationHistory: ChatMessage[],
  documentNames: string[]
): Promise<string> {
  const systemPrompt = await buildRAGPrompt(context, documentNames);
  
  // Build conversation history for Gemini
  const history = conversationHistory
    .filter((m) => m.status === 'done')
    .slice(-6) // last 6 messages for context window management
    .map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: m.content,
    }));
  
  // Include context in the user question
  const contextualQuestion = context.chunks.length > 0
    ? question
    : `${question}\n\n[NOTE: No relevant context was found in the uploaded documents for this specific question.]`;
  
  return generateAnswer(systemPrompt, contextualQuestion, history);
}