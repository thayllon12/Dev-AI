import express from 'express';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Configuração do armazenamento temporário de arquivos
// Estrutura: Record<fileId, { filename: string, content: string | Buffer, mimeType: string, expiresAt: number }>
const fileStore = new Map();
const FILE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hora

// Rotina para limpar arquivos expirados
setInterval(() => {
  const now = Date.now();
  for (const [id, file] of fileStore.entries()) {
    if (now > file.expiresAt) {
      fileStore.delete(id);
      console.log(`[File System] Arquivo expirado removido: ${id}`);
    }
  }
}, 5 * 60 * 1000); // Roda a cada 5 minutos

// ==========================================
// API REST - Geração e Download de Arquivos
// ==========================================

app.post('/api/files', (req, res) => {
  const { filename, content, mimeType, isBase64 } = req.body;
  
  if (!filename || content === undefined) {
    return res.status(400).json({ error: 'filename and content are required' });
  }

  const id = crypto.randomUUID();
  let fileContent = content;

  if (isBase64) {
    fileContent = Buffer.from(content, 'base64');
  } else if (typeof content === 'string') {
    fileContent = Buffer.from(content, 'utf-8');
  }

  fileStore.set(id, {
    filename,
    content: fileContent,
    mimeType: mimeType || 'application/octet-stream',
    expiresAt: Date.now() + FILE_EXPIRATION_MS
  });

  console.log(`[File System] Arquivo criado: ${id} (${filename})`);
  
  res.json({
    success: true,
    fileId: id,
    filename,
    size: fileContent.length,
    downloadUrl: `/api/files/download/${id}`
  });
});

app.post('/api/files/zip', async (req, res) => {
  const { files, zipFilename } = req.body; // files: [{ filename, content, isBase64 }]
  
  if (!files || !Array.isArray(files)) {
    return res.status(400).json({ error: 'files must be an array' });
  }

  try {
    const zip = new JSZip();
    
    for (const f of files) {
      const content = f.isBase64 ? Buffer.from(f.content, 'base64') : f.content;
      zip.file(f.filename, content);
    }
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const id = crypto.randomUUID();
    const finalName = zipFilename || 'archive.zip';
    
    fileStore.set(id, {
      filename: finalName,
      content: zipBuffer,
      mimeType: 'application/zip',
      expiresAt: Date.now() + FILE_EXPIRATION_MS
    });

    console.log(`[File System] ZIP criado: ${id} (${finalName})`);
    
    res.json({
      success: true,
      fileId: id,
      filename: finalName,
      size: zipBuffer.length,
      downloadUrl: `/api/files/download/${id}`
    });
    
  } catch (err) {
    console.error('Error creating zip:', err);
    res.status(500).json({ error: 'Failed to create zip file' });
  }
});

app.get('/api/files/download/:id', (req, res) => {
  const { id } = req.params;
  const file = fileStore.get(id);
  
  if (!file) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);
  res.setHeader('Content-Type', file.mimeType);
  res.send(file.content);
});

app.delete('/api/files/:id', (req, res) => {
  const { id } = req.params;
  if (fileStore.has(id)) {
    fileStore.delete(id);
    return res.json({ success: true, message: 'File deleted' });
  }
  res.status(404).json({ error: 'File not found' });
});

// Vite middleware para dev ou static files para production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('Falha ao iniciar o vite', e);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Sistema de arquivos inicializado.');
  });
}

startServer();
