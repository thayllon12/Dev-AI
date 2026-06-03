export const processLargeFile = async (file: File): Promise<{text: string, lineCount: number}> => {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    const chunkSize = 1024 * 1024; // 1MB chunks
    let offset = 0;
    const reader = new FileReader();
    let text = ""; // For simplicity, we can still load it into memory, 12000 lines is small in RAM (e.g. 500KB)

    reader.onload = (e) => {
      if (!e.target?.result) return;
      const chunk = e.target.result as string;
      text += chunk;
      
      // Count lines in this chunk
      let i = -1;
      while ((i = chunk.indexOf('\n', i + 1)) !== -1) {
        lineCount++;
      }

      offset += chunkSize;
      if (offset < file.size) {
        readNextChunk();
      } else {
        if (text.length > 0 && !text.endsWith('\n')) {
          lineCount++;
        }
        resolve({ text, lineCount });
      }
    };

    reader.onerror = () => reject(reader.error);

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsText(slice);
    };

    readNextChunk();
  });
};

// Simple IDB wrapper
const DB_NAME = 'DevAI_Files';
const DB_VERSION = 1;
const STORE_NAME = 'files';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveFileToDB = async (id: string, text: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(text, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getFileFromDB = async (id: string): Promise<string> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || "");
    request.onerror = () => reject(request.error);
  });
};

export const deleteFileFromDB = async (id: string): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
