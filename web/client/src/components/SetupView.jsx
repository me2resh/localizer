import { useState, useEffect } from 'react';
import { fetchDependencies, streamPullModel } from '../lib/api';
import { useApp } from '../App';

const DEP_INFO = {
  ollama: { label: 'Ollama', desc: 'LLM runtime (required)', install: 'brew install --cask ollama' },
  pdftotext: { label: 'pdftotext', desc: 'PDF text extraction', install: 'brew install poppler' },
  tesseract: { label: 'Tesseract', desc: 'Image OCR', install: 'brew install tesseract' },
  sox: { label: 'SoX', desc: 'Audio recording', install: 'brew install sox' },
  whisper: { label: 'Whisper', desc: 'Audio transcription', install: 'brew install openai-whisper' },
};

const SUGGESTED_MODELS = [
  { name: 'llama3.2', desc: '3B params, fast & capable' },
  { name: 'llama3.2:1b', desc: '1B params, very fast' },
  { name: 'mistral', desc: '7B params, great quality' },
  { name: 'llava', desc: 'Vision model, image support' },
  { name: 'gemma2', desc: 'Google, 9B params' },
  { name: 'phi3', desc: 'Microsoft, 3.8B params' },
];

export default function SetupView() {
  const { ollamaStatus, models, refreshModels } = useApp();
  const [deps, setDeps] = useState(null);
  const [pullName, setPullName] = useState('');
  const [pullStatus, setPullStatus] = useState('');
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    fetchDependencies().then(setDeps).catch(() => {});
  }, []);

  async function handlePull(name) {
    const modelName = name || pullName.trim();
    if (!modelName || isPulling) return;

    setIsPulling(true);
    setPullStatus('Starting download...');

    try {
      for await (const chunk of streamPullModel(modelName)) {
        if (chunk.status) {
          let status = chunk.status;
          if (chunk.total && chunk.completed) {
            const pct = Math.round((chunk.completed / chunk.total) * 100);
            status += ` ${pct}%`;
          }
          setPullStatus(status);
        }
        if (chunk.error) {
          setPullStatus('Error: ' + chunk.error);
          setIsPulling(false);
          return;
        }
      }
      setPullStatus('Done! Model ready.');
      refreshModels();
    } catch (err) {
      setPullStatus('Error: ' + err.message);
    }

    setIsPulling(false);
  }

  function formatSize(bytes) {
    if (!bytes) return '';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? gb.toFixed(1) + ' GB' : (bytes / (1024 * 1024)).toFixed(0) + ' MB';
  }

  return (
    <div className="animate-fade-in">
      <h1 className="view-header">Setup & Status</h1>
      <p className="view-subtitle">System status, dependencies, and model management</p>

      <div className="space-y-8">
        {/* Ollama Status */}
        <div className="card p-5 gradient-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${ollamaStatus === 'running' ? 'bg-jade' : 'bg-red-500'}`} />
              <div>
                <h3 className="font-display font-semibold text-forge-50">Ollama</h3>
                <p className="text-xs text-forge-400 font-mono">localhost:11434</p>
              </div>
            </div>
            <span className={`text-sm font-mono px-3 py-1 rounded-full ${
              ollamaStatus === 'running'
                ? 'bg-jade/10 text-jade'
                : 'bg-red-500/10 text-red-400'
            }`}>
              {ollamaStatus === 'running' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Dependencies */}
        <div>
          <h2 className="font-display font-semibold text-forge-100 text-lg mb-3">Dependencies</h2>
          <div className="space-y-2">
            {deps &&
              Object.entries(DEP_INFO).map(([key, info]) => (
                <div
                  key={key}
                  className="card-hover px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${deps[key] ? 'bg-jade' : 'bg-forge-500'}`} />
                    <div>
                      <span className="text-sm text-forge-200 font-medium">{info.label}</span>
                      <span className="text-xs text-forge-400 ml-2">{info.desc}</span>
                    </div>
                  </div>
                  {!deps[key] && (
                    <code className="text-xs text-forge-400 bg-forge-800 px-2 py-1 rounded font-mono">
                      {info.install}
                    </code>
                  )}
                  {deps[key] && (
                    <span className="text-xs text-jade font-mono">installed</span>
                  )}
                </div>
              ))}
            {!deps && (
              <div className="card p-4 text-sm text-forge-400">Loading dependency status...</div>
            )}
          </div>
        </div>

        {/* Installed Models */}
        <div>
          <h2 className="font-display font-semibold text-forge-100 text-lg mb-3">
            Installed Models
            <span className="text-forge-400 font-body font-normal text-sm ml-2">({models.length})</span>
          </h2>
          {models.length > 0 ? (
            <div className="space-y-2">
              {models.map((m) => (
                <div key={m.name} className="card px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-ember-glow flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-ember">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-sm text-forge-200 font-mono">{m.name}</span>
                  </div>
                  <span className="text-xs text-forge-400 font-mono">{formatSize(m.size)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="card p-4 text-sm text-forge-400">
              No models installed. Pull one below to get started.
            </div>
          )}
        </div>

        {/* Pull Model */}
        <div>
          <h2 className="font-display font-semibold text-forge-100 text-lg mb-3">Pull a Model</h2>

          {/* Quick picks */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {SUGGESTED_MODELS.map((m) => {
              const installed = models.some((im) => im.name === m.name || im.name.startsWith(m.name + ':'));
              return (
                <button
                  key={m.name}
                  onClick={() => !installed && handlePull(m.name)}
                  disabled={isPulling || installed}
                  className={`
                    card-hover px-3 py-2.5 text-left transition-all
                    ${installed ? 'opacity-50' : ''}
                  `}
                >
                  <div className="text-sm font-mono text-forge-200">{m.name}</div>
                  <div className="text-[10px] text-forge-400 mt-0.5">
                    {installed ? 'Installed' : m.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom pull */}
          <div className="flex gap-2">
            <input
              value={pullName}
              onChange={(e) => setPullName(e.target.value)}
              placeholder="Model name (e.g. codellama:7b)"
              className="input-field flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handlePull()}
            />
            <button
              onClick={() => handlePull()}
              disabled={isPulling || !pullName.trim()}
              className="btn-primary px-6"
            >
              {isPulling ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                'Pull'
              )}
            </button>
          </div>

          {pullStatus && (
            <div className="mt-3 px-3 py-2 bg-forge-800/50 rounded-lg border border-forge-600/30 animate-fade-in">
              <p className="text-xs text-forge-300 font-mono">{pullStatus}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
