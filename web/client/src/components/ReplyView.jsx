import { useState, useRef, useEffect } from 'react';
import { streamReply } from '../lib/api';
import ModelSelector from './ModelSelector';

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Clear, business-appropriate' },
  { id: 'friendly', label: 'Friendly Pro', desc: 'Warm yet competent' },
  { id: 'formal', label: 'Formal', desc: 'Executive-level' },
  { id: 'direct', label: 'Direct', desc: 'Concise, to the point' },
  { id: 'diplomatic', label: 'Diplomatic', desc: 'Tactful, considerate' },
];

export default function ReplyView() {
  const [model, setModel] = useState('');
  const [originalMessage, setOriginalMessage] = useState('');
  const [draftReply, setDraftReply] = useState('');
  const [tone, setTone] = useState('professional');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleGenerate() {
    if (!model || !originalMessage.trim() || !draftReply.trim()) return;
    setIsGenerating(true);
    setOutput('');
    setCopied(false);

    try {
      for await (const chunk of streamReply(model, originalMessage, draftReply, tone)) {
        if (chunk.error) {
          setOutput((p) => p + '\nError: ' + chunk.error);
          break;
        }
        if (chunk.token) {
          setOutput((p) => p + chunk.token);
        }
      }
    } catch (err) {
      setOutput((p) => p + '\nConnection error: ' + err.message);
    }

    setIsGenerating(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="view-header">Reply Polisher</h1>
      <p className="view-subtitle">
        Refine your message replies with the right tone
      </p>

      <div className="space-y-6">
        {/* Model */}
        <div>
          <label className="label">Model</label>
          <ModelSelector value={model} onChange={setModel} />
        </div>

        {/* Original message */}
        <div>
          <label className="label">Original Message</label>
          <textarea
            value={originalMessage}
            onChange={(e) => setOriginalMessage(e.target.value)}
            placeholder="Paste the message you received..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        {/* Draft reply */}
        <div>
          <label className="label">Your Draft Reply</label>
          <textarea
            value={draftReply}
            onChange={(e) => setDraftReply(e.target.value)}
            placeholder="Write your rough draft reply..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        {/* Tone selector */}
        <div>
          <label className="label">Tone</label>
          <div className="grid grid-cols-5 gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`
                  flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-center
                  transition-all duration-150
                  ${
                    tone === t.id
                      ? 'bg-ember-glow border-ember/40 text-ember-light'
                      : 'bg-forge-800/50 border-forge-600/40 text-forge-300 hover:border-forge-500 hover:text-forge-200'
                  }
                `}
              >
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-[10px] opacity-60">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !model || !originalMessage.trim() || !draftReply.trim()}
          className="btn-primary"
        >
          {isGenerating ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3" strokeLinecap="round" />
                <circle cx="12" cy="12" r="4" />
              </svg>
              Polish Reply
            </>
          )}
        </button>

        {/* Output */}
        {output && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Polished Reply</label>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="btn-ghost text-xs">
                  {copied ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-jade">
                        <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-jade">Copied</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-ghost text-xs"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Regenerate
                </button>
              </div>
            </div>
            <div
              ref={outputRef}
              className={`card p-5 text-sm leading-relaxed text-forge-200 whitespace-pre-wrap ${isGenerating ? 'streaming-cursor' : ''}`}
            >
              {output}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
