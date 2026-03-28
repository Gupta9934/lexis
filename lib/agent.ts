
import { generateAnswer, generateEmbedding } from './gemini';
import { queryVectors } from './pinecone';
import { retrieveContext, answerWithRAG } from './rag';
import { AgentResponse, ChatMessage, Citation } from './types';

async function webSearch(query: string): Promise<string> {
  const { tavily } = await import('@tavily/core');
  
  const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  
  const result = await client.search(query, {
    searchDepth: 'advanced',
    maxResults: 5,
    includeAnswer: true,
  });
  
  if (result.answer) {
    return result.answer;
  }
  
  // Fallback: compile results
  return result.results
    .slice(0, 3)
    .map((r: { title: string; content: string; url: string }) => `**${r.title}**\n${r.content}\nSource: ${r.url}`)
    .join('\n\n');
}

async function decomposeAndAnswer(
  question: string,
  subQuestions: string[],
  sessionId: string,
  conversationHistory: ChatMessage[],
  documentNames: string[]
): Promise<{ answer: string; citations: Citation[]; confidence: number }> {
  // Retrieve context for each sub-question
  const subContexts = await Promise.all(
    subQuestions.map((sq) => retrieveContext(sq, sessionId, 4))
  );
  
  // Merge all chunks (deduplicate by id)
  const allChunks = new Map();
  const allCitations = new Map<string, Citation>();
  
  for (const ctx of subContexts) {
    for (const chunk of ctx.chunks) {
      allChunks.set(chunk.id, chunk);
    }
    for (const citation of ctx.citations) {
      const key = `${citation.documentName}-p${citation.pageNumber}`;
      if (!allCitations.has(key) || citation.relevanceScore > allCitations.get(key)!.relevanceScore) {
        allCitations.set(key, citation);
      }
    }
  }
  
  const mergedContext = {
    chunks: Array.from(allChunks.values()),
    citations: Array.from(allCitations.values()),
    confidence: Math.max(...subContexts.map((c) => c.confidence)),
  };
  
  const subAnswersPrompt = `You are LEXIS. The user asked a complex question that was broken into sub-questions.

Original question: "${question}"

Sub-questions analyzed:
${subQuestions.map((sq, i) => `${i + 1}. ${sq}`).join('\n')}

Relevant context from documents (${documentNames.join(', ')}):
${mergedContext.chunks.map((c, i) => `[${i + 1}: ${c.metadata.documentName}, p.${c.metadata.pageNumber}]\n${c.text}`).join('\n\n---\n\n')}

Synthesize a comprehensive answer that addresses all sub-questions. Use citations like [Doc Name, Page X].
Structure with clear sections for each aspect. Be analytical and insightful.`;

  const history = conversationHistory
    .filter((m) => m.status === 'done')
    .slice(-4)
    .map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: m.content,
    }));
  
  const answer = await generateAnswer(subAnswersPrompt, question, history);
  
  return {
    answer,
    citations: mergedContext.citations,
    confidence: mergedContext.confidence,
  };
}

export async function runAgent(
  question: string,
  sessionId: string,
  conversationHistory: ChatMessage[],
  documentNames: string[],
  isComplex: boolean = false,
  subQuestions: string[] = [],
  forceWebSearch: boolean = false
): Promise<AgentResponse> {
  
  // Step 1: Handle complex questions with decomposition
  if (isComplex && subQuestions.length > 0) {
    const result = await decomposeAndAnswer(
      question, subQuestions, sessionId, conversationHistory, documentNames
    );
    
    // If confidence is still too low, augment with web search
    if (result.confidence < 0.35 && documentNames.length > 0) {
      let webAnswer = '';
      try {
        webAnswer = await webSearch(question);
      } catch {
        // Tavily failed silently
      }
      
      return {
        answer: result.answer + (webAnswer ? `\n\n---\n**Additionally, from web research:**\n${webAnswer}` : ''),
        citations: result.citations,
        usedWebSearch: !!webAnswer,
        webSearchQuery: webAnswer ? question : undefined,
        subQuestions,
        confidence: result.confidence,
      };
    }
    
    return {
      answer: result.answer,
      citations: result.citations,
      usedWebSearch: false,
      subQuestions,
      confidence: result.confidence,
    };
  }
  
  // Step 2: Standard RAG retrieval
  const context = await retrieveContext(question, sessionId, 6);
  
  const CONFIDENCE_THRESHOLD = 0.40;
  const hasGoodContext = context.confidence >= CONFIDENCE_THRESHOLD && context.chunks.length >= 2;
  
  // Step 3: If good context found, answer from documents
  if (hasGoodContext && !forceWebSearch) {
    const answer = await answerWithRAG(question, context, conversationHistory, documentNames);
    
    return {
      answer,
      citations: context.citations,
      usedWebSearch: false,
      confidence: context.confidence,
    };
  }
  
  // Step 4: Agent fallback — try web search
  let webSearchResult = '';
  let webSearchQuery = question;
  
  try {
    webSearchResult = await webSearch(question);
  } catch (error) {
    console.error('Web search failed:', error);
  }
  
  // Step 5: Generate final answer combining weak doc context + web
  const hasDocContext = context.chunks.length > 0;
  
  const fallbackSystemPrompt = `You are LEXIS, an expert research assistant.

${hasDocContext ? `PARTIAL CONTEXT FROM UPLOADED DOCUMENTS:
${context.chunks.slice(0, 3).map((c, i) => `[${i + 1}: ${c.metadata.documentName}, p.${c.metadata.pageNumber}]\n${c.text}`).join('\n\n---\n\n')}

` : 'The uploaded documents do not contain relevant information for this question.\n\n'}${webSearchResult ? `WEB SEARCH RESULTS:
${webSearchResult}

` : ''}INSTRUCTIONS:
- If answering from documents, cite them as [Doc Name, Page X]
- If using web search, mention that this information comes from web research
- Be clear about which source each piece of information comes from
- Acknowledge any limitations in the available information`;

  const history = conversationHistory
    .filter((m) => m.status === 'done')
    .slice(-4)
    .map((m) => ({
      role: m.role === 'user' ? 'user' as const : 'model' as const,
      parts: m.content,
    }));
  
  const answer = await generateAnswer(fallbackSystemPrompt, question, history);
  
  return {
    answer,
    citations: context.citations,
    usedWebSearch: !!webSearchResult,
    webSearchQuery: webSearchResult ? webSearchQuery : undefined,
    confidence: Math.max(context.confidence, webSearchResult ? 0.6 : 0),
  };
}