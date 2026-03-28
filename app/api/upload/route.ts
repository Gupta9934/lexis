import { NextRequest, NextResponse } from 'next/server';
import { parsePDF } from '@/lib/chunker';
import { generateBatchEmbeddings } from '@/lib/gemini';
import { upsertVectors } from '@/lib/pinecone';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = formData.get('sessionId') as string;
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    
    if (files.length > 5) {
      return NextResponse.json({ error: 'Maximum 5 files allowed' }, { status: 400 });
    }
    
    const uploadedDocs = [];
    
    for (const file of files) {
      if (!file.name.endsWith('.pdf')) {
        return NextResponse.json({ error: `${file.name} is not a PDF` }, { status: 400 });
      }
      
      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Parse PDF and chunk
      const parsed = await parsePDF(buffer, file.name, sessionId);
      console.log('✅ PDF parsed, chunks:', parsed.chunks.length);

      if (parsed.pageCount > 10) {
        return NextResponse.json(
          { error: `${file.name} has ${parsed.pageCount} pages. Maximum 10 pages allowed.` },
          { status: 400 }
        );
      }
      
      if (parsed.chunks.length === 0) {
        return NextResponse.json(
          { error: `Could not extract text from ${file.name}. Ensure it's not a scanned/image PDF.` },
          { status: 400 }
        );
      }
      
      // Generate embeddings for all chunks
      const texts = parsed.chunks.map((c) => c.text);
      const embeddings = await generateBatchEmbeddings(texts);
      console.log('✅ Embeddings generated:', embeddings.length);

      // Prepare vectors for Pinecone
      const vectors = parsed.chunks.map((chunk, idx) => ({
        id: chunk.id,
        values: embeddings[idx],
        metadata: {
          ...chunk.metadata,
          text: chunk.text, // Store text in metadata for retrieval
        },
      }));
      
      // Upsert to Pinecone
      await upsertVectors(vectors);
      console.log('✅ Vectors upserted to Pinecone');

      uploadedDocs.push({
        id: parsed.documentId,
        name: parsed.name,
        pageCount: parsed.pageCount,
        chunkCount: parsed.chunks.length,
        uploadedAt: new Date().toISOString(),
        size: file.size,
      });
    }
    
    return NextResponse.json({
      success: true,
      documents: uploadedDocs,
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process document. Please try again.' },
      { status: 500 }
    );
  }
}