import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/agent';
import { classifyQuestion } from '@/lib/gemini';
import { ChatMessage } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      question,
      sessionId,
      conversationHistory,
      documentNames,
    }: {
      question: string;
      sessionId: string;
      conversationHistory: ChatMessage[];
      documentNames: string[];
    } = body;
    
    if (!question || !sessionId) {
      return NextResponse.json({ error: 'Question and session ID required' }, { status: 400 });
    }
    
    // Step 1: Classify the question
    const classification = await classifyQuestion(question, documentNames);
    
    // Step 2: Run the agent
    const agentResponse = await runAgent(
      question,
      sessionId,
      conversationHistory,
      documentNames,
      classification.isComplex,
      classification.suggestedSubQuestions,
      classification.needsWebSearch
    );
    
    return NextResponse.json({
      answer: agentResponse.answer,
      citations: agentResponse.citations,
      usedWebSearch: agentResponse.usedWebSearch,
      webSearchQuery: agentResponse.webSearchQuery,
      subQuestions: agentResponse.subQuestions,
      confidence: agentResponse.confidence,
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response. Please try again.' },
      { status: 500 }
    );
  }
}