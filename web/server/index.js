import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn } from 'child_process';
import { readFile, mkdir, unlink } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3001;
const OLLAMA_URL = 'http://localhost:11434';

const uploadDir = join(__dirname, 'uploads');
if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ── Helpers ──────────────────────────────────────────────

async function readUploadedFiles(files) {
  const contents = [];
  for (const file of files) {
    const ext = extname(file.originalname).toLowerCase();
    let entry;

    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) {
      const buf = await readFile(file.path);
      entry = { type: 'image', data: buf.toString('base64'), name: file.originalname };
    } else if (ext === '.pdf') {
      entry = await new Promise((resolve) => {
        const proc = spawn('pdftotext', ['-layout', file.path, '-']);
        let text = '';
        proc.stdout.on('data', (d) => (text += d));
        proc.on('close', (code) => {
          resolve({
            type: 'text',
            data: code === 0 && text ? text : '[PDF extraction failed — install poppler]',
            name: file.originalname,
          });
        });
        proc.on('error', () =>
          resolve({ type: 'text', data: '[pdftotext not installed]', name: file.originalname })
        );
      });
    } else {
      const text = await readFile(file.path, 'utf-8').catch(() => '[Could not read file]');
      entry = { type: 'text', data: text, name: file.originalname };
    }
    contents.push(entry);
  }
  return contents;
}

function cleanupFiles(files) {
  for (const f of files) unlink(f.path).catch(() => {});
}

function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

async function pipeOllamaStream(ollamaRes, expressRes, tokenKey = 'response') {
  const reader = ollamaRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        const token = tokenKey === 'message' ? data.message?.content || '' : data[tokenKey] || '';
        expressRes.write(`data: ${JSON.stringify({ token, done: data.done })}\n\n`);
      } catch {}
    }
  }

  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer);
      const token = tokenKey === 'message' ? data.message?.content || '' : data[tokenKey] || '';
      expressRes.write(`data: ${JSON.stringify({ token, done: data.done })}\n\n`);
    } catch {}
  }

  expressRes.write('data: [DONE]\n\n');
  expressRes.end();
}

// ── Status ───────────────────────────────────────────────

app.get('/api/status', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    res.json({ status: r.ok ? 'running' : 'error' });
  } catch {
    res.json({ status: 'offline' });
  }
});

// ── Models ───────────────────────────────────────────────

app.get('/api/models', async (_req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await r.json();
    res.json(
      (data.models || []).map((m) => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Process (SSE) ────────────────────────────────────────

app.post('/api/process', upload.array('files'), async (req, res) => {
  try {
    const { model, instructions } = req.body;
    const files = req.files || [];
    const fileContents = await readUploadedFiles(files);

    let prompt = instructions + '\n\nFile contents:\n';
    const images = [];
    for (const fc of fileContents) {
      if (fc.type === 'image') {
        images.push(fc.data);
        prompt += `\n[Image: ${fc.name}]\n`;
      } else {
        prompt += `\n--- ${fc.name} ---\n${fc.data}\n`;
      }
    }

    sseHeaders(res);

    const body = { model, prompt, stream: true };
    if (images.length) body.images = images;

    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    await pipeOllamaStream(r, res, 'response');
    cleanupFiles(files);
  } catch (err) {
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Chat (SSE) ───────────────────────────────────────────

app.post('/api/chat', async (req, res) => {
  try {
    const { model, messages, context } = req.body;

    // Inject file context directly into the first user message so all models see it
    const chatMessages = messages.map((m, i) => {
      if (context && i === 0 && m.role === 'user') {
        return {
          role: 'user',
          content: `Here are the file contents you must use to answer my question:\n\n${context}\n\n---\n\nBased on the file contents above, ${m.content}`,
        };
      }
      return m;
    });

    sseHeaders(res);

    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: chatMessages, stream: true }),
    });

    await pipeOllamaStream(r, res, 'message');
  } catch (err) {
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Reply (SSE) ──────────────────────────────────────────

const TONE_MAP = {
  professional: 'Use a professional, business-appropriate tone.',
  friendly: 'Use a friendly but professional tone — warm yet competent.',
  formal: 'Use a formal, executive-level tone suitable for C-suite communication.',
  direct: 'Be direct and concise. Get to the point efficiently.',
  diplomatic: 'Use a diplomatic, carefully worded tone that is tactful and considerate.',
};

app.post('/api/reply', async (req, res) => {
  try {
    const { model, originalMessage, draftReply, tone } = req.body;

    const prompt = `You are a professional communication assistant. ${TONE_MAP[tone] || TONE_MAP.professional}

The user received this message:
---
${originalMessage}
---

The user's draft reply:
---
${draftReply}
---

Polish and refine the draft reply while keeping the user's intended meaning. Output only the polished reply.`;

    sseHeaders(res);

    const r = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: true }),
    });

    await pipeOllamaStream(r, res, 'response');
  } catch (err) {
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Voices ───────────────────────────────────────────────

app.get('/api/voices', async (_req, res) => {
  try {
    const voices = await new Promise((resolve, reject) => {
      const proc = spawn('say', ['-v', '?']);
      let out = '';
      proc.stdout.on('data', (d) => (out += d));
      proc.on('close', () => {
        const list = out
          .split('\n')
          .filter((l) => l.includes('en_'))
          .map((l) => {
            const m = l.match(/^(\S+)\s+(\S+)/);
            return m ? { name: m[1], locale: m[2] } : null;
          })
          .filter(Boolean);
        resolve(list);
      });
      proc.on('error', reject);
    });
    res.json(voices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Speak ────────────────────────────────────────────────

let speakProc = null;

app.post('/api/speak', upload.array('files'), async (req, res) => {
  try {
    const { voice, rate, text } = req.body;
    const files = req.files || [];

    let content = text || '';
    if (files.length) {
      const fc = await readUploadedFiles(files);
      content = fc.map((f) => f.data).join('\n\n');
      cleanupFiles(files);
    }

    if (!content.trim()) return res.status(400).json({ error: 'No content to speak' });

    if (speakProc) {
      speakProc.kill();
      speakProc = null;
    }

    const args = [];
    if (voice) args.push('-v', voice);
    if (rate) args.push('-r', String(rate));

    speakProc = spawn('say', [...args, content]);
    speakProc.on('close', () => (speakProc = null));

    res.json({ status: 'speaking' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/speak/stop', (_req, res) => {
  if (speakProc) {
    speakProc.kill();
    speakProc = null;
    return res.json({ status: 'stopped' });
  }
  res.json({ status: 'idle' });
});

// ── Transcribe (audio file upload) ───────────────────────

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const audioPath = req.file.path;

  // First convert webm→wav with ffmpeg (whisper needs wav/mp3/etc)
  const wavPath = audioPath + '.wav';
  const ffmpegOk = await new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-y', '-i', audioPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wavPath]);
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });

  if (!ffmpegOk) {
    unlink(audioPath).catch(() => {});
    unlink(wavPath).catch(() => {});
    return res.status(500).json({
      error: 'ffmpeg is required to convert audio. Install with: brew install ffmpeg',
    });
  }

  // Transcribe with whisper
  const result = await new Promise((resolve) => {
    const proc = spawn('whisper', [
      wavPath,
      '--model', 'tiny',
      '--output_format', 'txt',
      '--output_dir', uploadDir,
    ]);

    let stderr = '';
    proc.stderr.on('data', (d) => (stderr += d));

    proc.on('close', async (code) => {
      // whisper writes <basename>.txt in output_dir
      const baseName = wavPath.split('/').pop().replace('.wav', '');
      const txtPath = join(uploadDir, baseName + '.txt');
      const text = await readFile(txtPath, 'utf-8').catch(() => '');

      // Cleanup temp files
      unlink(audioPath).catch(() => {});
      unlink(wavPath).catch(() => {});
      unlink(txtPath).catch(() => {});

      if (code !== 0 || !text.trim()) {
        resolve({
          error: null,
          transcription: text.trim() || 'No speech detected in the recording.',
        });
      } else {
        resolve({ transcription: text.trim() });
      }
    });

    proc.on('error', () => {
      unlink(audioPath).catch(() => {});
      unlink(wavPath).catch(() => {});
      resolve({
        error: 'Whisper is not installed. Install with: brew install openai-whisper',
      });
    });
  });

  res.json(result);
});

// ── Upload (read + return contents) ─────────────────────

app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const contents = await readUploadedFiles(req.files || []);
    cleanupFiles(req.files || []);
    res.json(contents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Pull model (SSE) ────────────────────────────────────

app.post('/api/models/pull', async (req, res) => {
  try {
    const { name } = req.body;
    sseHeaders(res);

    const r = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, stream: true }),
    });

    const reader = r.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          res.write(`data: ${JSON.stringify(JSON.parse(line))}\n\n`);
        } catch {}
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!res.headersSent) return res.status(500).json({ error: err.message });
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Dependencies ─────────────────────────────────────────

app.get('/api/dependencies', async (_req, res) => {
  const cmds = ['ollama', 'pdftotext', 'tesseract', 'sox', 'whisper'];
  const results = {};
  await Promise.all(
    cmds.map(
      (cmd) =>
        new Promise((resolve) => {
          const proc = spawn('which', [cmd]);
          proc.on('close', (code) => {
            results[cmd] = code === 0;
            resolve();
          });
          proc.on('error', () => {
            results[cmd] = false;
            resolve();
          });
        })
    )
  );
  res.json(results);
});

// ── Start ────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  ◆ Localizer server → http://localhost:${PORT}\n`);
});
