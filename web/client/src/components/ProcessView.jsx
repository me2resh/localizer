import { useState, useRef, useEffect } from 'react';
import { streamProcess } from '../lib/api';
import FileDropzone from './FileDropzone';
import ModelSelector from './ModelSelector';

export default function ProcessView() {
  const [files, setFiles] = useState([]);
  const [model, setModel] = useState('');
  const [instructions, setInstructions] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleProcess() {
    if (!model || !files.length) return;
    setIsProcessing(true);
    setOutput('');

    try {
      for await (const chunk of streamProcess(files, model, instructions)) {
        if (chunk.error) {
          setOutput((p) => p + '\n\nError: ' + chunk.error);
          break;
        }
        if (chunk.token) {
          setOutput((p) => p + chunk.token);
        }
      }
    } catch (err) {
      setOutput((p) => p + '\n\nConnection error: ' + err.message);
    }

    setIsProcessing(false);
  }

  function handleSave() {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'localizer-output.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopy() {
    navigator.clipboard.writeText(output);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="view-header">Process Files</h1>
      <p className="view-subtitle">
        Feed files to a local LLM with custom instructions
      </p>

      <div className="space-y-6">
        {/* Files */}
        <div>
          <label className="label">Files</label>
          <FileDropzone files={files} onFilesChange={setFiles} />
        </div>

        {/* Model */}
        <div>
          <label className="label">Model</label>
          <ModelSelector value={model} onChange={setModel} />
        </div>

        {/* Instructions */}
        <div>
          <label className="label">Instructions</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Summarize this document, extract key insights..."
            rows={4}
            className="input-field resize-none"
          />
        </div>

        {/* Action */}
        <button
          onClick={handleProcess}
          disabled={isProcessing || !model || !files.length}
          className="btn-primary"
        >
          {isProcessing ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Process
            </>
          )}
        </button>

        {/* Output */}
        {output && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Output</label>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="btn-ghost text-xs">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </button>
                <button onClick={handleSave} className="btn-ghost text-xs">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Save
                </button>
              </div>
            </div>
            <div
              ref={outputRef}
              className={`card p-5 max-h-[500px] overflow-y-auto font-mono text-sm leading-relaxed text-forge-200 whitespace-pre-wrap ${isProcessing ? 'streaming-cursor' : ''}`}
            >
              {output}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
