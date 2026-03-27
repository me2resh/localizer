const BASE = '/api';

export async function checkStatus() {
  const res = await fetch(`${BASE}/status`);
  return res.json();
}

export async function fetchModels() {
  const res = await fetch(`${BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function fetchVoices() {
  const res = await fetch(`${BASE}/voices`);
  return res.json();
}

export async function fetchDependencies() {
  const res = await fetch(`${BASE}/dependencies`);
  return res.json();
}

export async function uploadFiles(files) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const res = await fetch(`${BASE}/upload`, { method: 'POST', body: fd });
  return res.json();
}

// ── SSE stream helpers ───────────────────────────────────

async function* readSSE(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop();

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const payload = trimmed.slice(6);
      if (payload === '[DONE]') return;
      try {
        yield JSON.parse(payload);
      } catch {}
    }
  }
}

export async function* streamProcess(files, model, instructions) {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  fd.append('model', model);
  fd.append('instructions', instructions);

  const res = await fetch(`${BASE}/process`, { method: 'POST', body: fd });
  yield* readSSE(res);
}

export async function* streamChat(model, messages, context) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, context }),
  });
  yield* readSSE(res);
}

export async function* streamReply(model, originalMessage, draftReply, tone) {
  const res = await fetch(`${BASE}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, originalMessage, draftReply, tone }),
  });
  yield* readSSE(res);
}

export async function* streamPullModel(name) {
  const res = await fetch(`${BASE}/models/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  yield* readSSE(res);
}

export async function speak(text, voice, rate, files) {
  const fd = new FormData();
  if (files?.length) files.forEach((f) => fd.append('files', f));
  fd.append('text', text || '');
  if (voice) fd.append('voice', voice);
  if (rate) fd.append('rate', String(rate));
  const res = await fetch(`${BASE}/speak`, { method: 'POST', body: fd });
  return res.json();
}

export async function stopSpeaking() {
  const res = await fetch(`${BASE}/speak/stop`, { method: 'POST' });
  return res.json();
}

export async function transcribeAudio(audioBlob) {
  const fd = new FormData();
  fd.append('audio', audioBlob, `recording-${Date.now()}.webm`);
  const res = await fetch(`${BASE}/transcribe`, { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
    throw new Error(err.error || 'Transcription failed');
  }
  return res.json();
}
