import { NextRequest, NextResponse } from 'next/server';
import { deleteSessionVectors } from '@/lib/pinecone';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    await deleteSessionVectors(sessionId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: 'Failed to clear session.' },
      { status: 500 }
    );
  }
}