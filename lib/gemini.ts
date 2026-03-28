import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }
  return genAI;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: 'gemini-embedding-001' });
  
  const truncated = text.slice(0, 8000);
  
  const result = await model.embedContent({
    content: {
      parts: [{ text: truncated }],
      role: 'user',
    },
  });
  
  return result.embedding.values;
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  const batchSize = 5;
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((text) => generateEmbedding(text))
    );
    results.push(...batchResults);
    
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

export async function generateAnswer(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'model'; parts: string }>
): Promise<string> {
  const client = getGenAI();
  const model = client.getGenerativeModel({
    // model: 'gemini-1.5-flash',
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  });
  
  const chat = model.startChat({
    history: conversationHistory.map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.parts }],
    })),
  });
  
  const result = await chat.sendMessage(userMessage);
  const response = await result.response;
  return response.text();
}

export async function classifyQuestion(question: string, documentNames: string[]): Promise<{
  needsWebSearch: boolean;
  isComplex: boolean;
  suggestedSubQuestions: string[];
}> {
  const client = getGenAI();
  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const prompt = `Analyze this question in the context of these documents: ${documentNames.join(', ')}.
  
Question: "${question}"
Respond ONLY with a JSON object (no markdown, no backticks):
{
  "needsWebSearch": boolean (true if question is about current events, real-time data, or topics clearly outside the documents),
  "isComplex": boolean (true if question has multiple sub-topics or requires comparing multiple aspects),
  "suggestedSubQuestions": string[] (if isComplex, break into 2-3 focused sub-questions, otherwise empty array)
}`;
  
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { needsWebSearch: false, isComplex: false, suggestedSubQuestions: [] };
  }
}