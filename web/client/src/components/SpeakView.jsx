import { useState, useEffect } from 'react';
import { speak, stopSpeaking, fetchVoices } from '../lib/api';
import FileDropzone from './FileDropzone';

export default function SpeakView() {
  const [files, setFiles] = useState([]);
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [voice, setVoice] = useState('');
  const [rate, setRate] = useState(180);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [source, setSource] = useState('text'); // 'text' or 'file'

  useEffect(() => {
    fetchVoices().then(setVoices).catch(() => {});
  }, []);

  async function handleSpeak() {
    setIsSpeaking(true);
    try {
      if (source === 'file') {
        await speak('', voice, rate, files);
      } else {
        await speak(text, voice, rate);
      }
    } catch (err) {
      console.error(err);
    }
    // The speech runs asynchronously on the server, we approximate duration
    // In a real app we'd poll or use websockets for completion
  }

  async function handleStop() {
    await stopSpeaking();
    setIsSpeaking(false);
  }

  const canSpeak = source === 'file' ? files.length > 0 : text.trim().length > 0;

  return (
    <div className="animate-fade-in">
      <h1 className="view-header">Text to Speech</h1>
      <p className="view-subtitle">
        Read your content aloud using macOS voices
      </p>

      <div className="space-y-6">
        {/* Source toggle */}
        <div>
          <label className="label">Source</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSource('text')}
              className={`
                flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                ${source === 'text' ? 'bg-ember-glow border-ember/40 text-ember-light' : 'bg-forge-800/50 border-forge-600/40 text-forge-300 hover:border-forge-500'}
              `}
            >
              Paste Text
            </button>
            <button
              onClick={() => setSource('file')}
              className={`
                flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all
                ${source === 'file' ? 'bg-ember-glow border-ember/40 text-ember-light' : 'bg-forge-800/50 border-forge-600/40 text-forge-300 hover:border-forge-500'}
              `}
            >
              Upload File
            </button>
          </div>
        </div>

        {/* Content */}
        {source === 'text' ? (
          <div>
            <label className="label">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to read aloud..."
              rows={6}
              className="input-field resize-none"
            />
          </div>
        ) : (
          <div>
            <label className="label">File</label>
            <FileDropzone files={files} onFilesChange={setFiles} compact />
          </div>
        )}

        {/* Voice */}
        <div>
          <label className="label">Voice</label>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="input-field appearance-none bg-[length:20px] bg-[right_12px_center] bg-no-repeat cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235c5c68' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            }}
          >
            <option value="">System Default</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} ({v.locale})
              </option>
            ))}
          </select>
        </div>

        {/* Speed */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="label mb-0">Speed</label>
            <span className="text-sm text-forge-300 font-mono">{rate} wpm</span>
          </div>
          <input
            type="range"
            min={80}
            max={400}
            step={10}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-full h-1.5 bg-forge-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-ember
              [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-ember/30
              [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-forge-500">Slow</span>
            <span className="text-[10px] text-forge-500">Fast</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSpeak}
            disabled={!canSpeak || isSpeaking}
            className="btn-primary"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M8 5v14l11-7z" />
            </svg>
            Speak
          </button>

          {isSpeaking && (
            <button onClick={handleStop} className="btn-secondary">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              Stop
            </button>
          )}
        </div>

        {isSpeaking && (
          <div className="card p-4 flex items-center gap-3 animate-fade-in">
            <div className="flex gap-1 items-end h-6">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 bg-ember rounded-full"
                  style={{
                    height: '100%',
                    animation: `soundbar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                  }}
                />
              ))}
            </div>
            <span className="text-sm text-forge-300">Speaking...</span>
            <style>{`
              @keyframes soundbar {
                0% { transform: scaleY(0.3); }
                100% { transform: scaleY(1); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}
