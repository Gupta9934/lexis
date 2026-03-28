import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'lexis-documents';
//export const EMBEDDING_DIMENSION = 768;
export const EMBEDDING_DIMENSION = 3072; 

export function getIndex() {
  const client = getPineconeClient();
  return client.index(PINECONE_INDEX_NAME);
}

export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata: Record<string, string | number | boolean>;
  }>
) {
  const index = getIndex();

  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

export async function queryVectors(
  embedding: number[],
  sessionId: string,
  topK: number = 6
) {
  const index = getIndex();

  const results = await index.query({
    vector: embedding,
    topK,
    filter: { sessionId: { $eq: sessionId } },
    includeMetadata: true,
  });

  return results.matches || [];
}

export async function deleteSessionVectors(sessionId: string) {
  const index = getIndex();
  await index.deleteMany({ sessionId: { $eq: sessionId } });
}

