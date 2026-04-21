import { GoogleGenAI } from "@google/genai";
import { getAI } from "../App"; // we'll need to export getAI from App.tsx

const DB_NAME = "dev-ai-memory";
const STORE_NAME = "embeddings";

interface MemoryItem {
  id: string;
  text: string;
  embedding: number[];
  timestamp: number;
}

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
  });
}

function cosineSimilarity(A: number[], B: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function saveToMemory(text: string, apiKey?: string) {
  try {
    if (!text || text.trim().length < 10) return; // Ignore very short texts
    
    // 1. Get Embedding
    const ai = getAI(apiKey);
    const result = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [text],
    });
    
    const embedding = result.embeddings?.[0]?.values;
    if (!embedding) return;

    // 2. Save to DB
    const db = await initDB();
    const item: MemoryItem = {
      id: crypto.randomUUID(),
      text,
      embedding,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(item);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Error saving to memory RAG:", err);
  }
}

export async function searchMemory(query: string, apiKey?: string, topK: number = 3): Promise<string[]> {
  try {
    const ai = getAI(apiKey);
    const result = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: [query],
    });
    
    const queryEmbedding = result.embeddings?.[0]?.values;
    if (!queryEmbedding) return [];

    const db = await initDB();
    const allItems: MemoryItem[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (allItems.length === 0) return [];

    // Calculate similarities
    const scoredItems = allItems.map(item => ({
      text: item.text,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }));

    // Sort descending by similarity
    scoredItems.sort((a, b) => b.similarity - a.similarity);

    // Return top K text contents (above a certain threshold, e.g., 0.5)
    return scoredItems
      .filter(item => item.similarity > 0.55)
      .slice(0, topK)
      .map(item => item.text);
      
  } catch (err) {
    console.error("Error searching memory RAG:", err);
    return [];
  }
}
