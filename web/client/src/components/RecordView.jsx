import { useState, useRef, useEffect } from 'react';

export default function RecordView() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [transcribing, setTranscribing] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // Enumerate audio input devices
  useEffect(() => {
    async function loadDevices() {
      try {
        // Need a brief getUserMedia call to get labeled devices
        const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tempStream.getTracks().forEach((t) => t.stop());

        const all = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = all.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
        if (!selectedDevice && audioInputs.length) {
          setSelectedDevice(audioInputs[0].deviceId);
        }
      } catch {
        // Permission denied — devices will stay empty, handled at record time
      }
    }

    loadDevices();

    // Refresh list when devices change (plug/unplug)
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  async function handleStart() {
    setResult(null);
    setPermissionDenied(false);
    chunksRef.current = [];

    try {
      const constraints = { audio: selectedDevice ? { deviceId: { exact: selectedDevice } } : true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // collect chunks every 250ms

      setIsRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      } else {
        setResult({ type: 'error', content: `Microphone error: ${err.message}` });
      }
    }
  }

  async function handleStop(action) {
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      setIsRecording(false);
      setResult({ type: 'error', content: 'No active recording found.' });
      return;
    }

    // Wait for the recorder to finish and collect all chunks
    const blob = await new Promise((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      };
      recorder.stop();
    });

    setIsRecording(false);
    mediaRecorderRef.current = null;

    if (action === 'save') {
      // Download locally
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setResult({ type: 'saved', content: `recording-${Date.now()}.webm (downloaded)` });
      return;
    }

    // Transcribe — send to server
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, `recording-${Date.now()}.webm`);

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }));
        setResult({ type: 'error', content: err.error || 'Transcription failed' });
      } else {
        const data = await res.json();
        if (data.error) {
          setResult({ type: 'error', content: data.error });
        } else {
          setResult({ type: 'transcription', content: data.transcription });
        }
      }
    } catch (err) {
      setResult({ type: 'error', content: `Connection error: ${err.message}` });
    }
    setTranscribing(false);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  function handleCopy() {
    if (result?.content) navigator.clipboard.writeText(result.content);
  }

  return (
    <div className="animate-fade-in">
      <h1 className="view-header">Record Audio</h1>
      <p className="view-subtitle">
        Record from your microphone, transcribe with Whisper
      </p>

      <div className="space-y-8">
        {/* Microphone selector */}
        {devices.length > 1 && (
          <div>
            <label className="label">Microphone</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isRecording}
              className="input-field appearance-none bg-[length:20px] bg-[right_12px_center] bg-no-repeat cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235c5c68' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              }}
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone (${d.deviceId.slice(0, 8)}...)`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Record button */}
        <div className="flex flex-col items-center gap-6 py-8">
          {!isRecording && !transcribing ? (
            <button
              onClick={handleStart}
              className="group relative w-32 h-32 rounded-full bg-forge-800 border-2 border-forge-600/50
                         hover:border-ember/50 transition-all duration-300"
            >
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-red-500 to-red-600
                              flex items-center justify-center transition-transform group-hover:scale-105
                              shadow-lg shadow-red-500/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-10 h-10">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
                </svg>
              </div>
            </button>
          ) : isRecording ? (
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-red-500/10 border-2 border-red-500/50
                              flex items-center justify-center animate-recording-pulse">
                <div className="text-center">
                  <div className="font-mono text-2xl font-bold text-red-400 tabular-nums">
                    {formatTime(elapsed)}
                  </div>
                  <div className="text-xs text-red-400/70 mt-1">Recording</div>
                </div>
              </div>
            </div>
          ) : (
            /* Transcribing spinner */
            <div className="w-32 h-32 rounded-full bg-ember/5 border-2 border-ember/30
                            flex items-center justify-center">
              <div className="text-center">
                <svg className="w-8 h-8 animate-spin mx-auto text-ember" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                  <path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div className="text-xs text-ember/70 mt-2">Transcribing</div>
              </div>
            </div>
          )}

          {!isRecording && !transcribing && !result && !permissionDenied && (
            <p className="text-sm text-forge-400">Click to start recording</p>
          )}

          {permissionDenied && (
            <div className="card p-4 border-red-500/30 flex items-center gap-3 max-w-md animate-fade-in">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-red-400 shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-red-300">
                Microphone access denied. Allow microphone access in your browser settings and try again.
              </p>
            </div>
          )}

          {/* Stop actions */}
          {isRecording && (
            <div className="flex gap-3 animate-fade-in">
              <button
                onClick={() => handleStop('transcribe')}
                className="btn-primary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
                Stop & Transcribe
              </button>
              <button
                onClick={() => handleStop('save')}
                className="btn-secondary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Stop & Save
              </button>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="animate-slide-up">
            {result.type === 'transcription' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Transcription</label>
                  <button onClick={handleCopy} className="btn-ghost text-xs">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    Copy
                  </button>
                </div>
                <div className="card p-5 text-sm text-forge-200 leading-relaxed whitespace-pre-wrap">
                  {result.content}
                </div>
              </div>
            )}

            {result.type === 'saved' && (
              <div className="card p-4 flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-jade shrink-0">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-sm text-forge-200">Recording saved</p>
                  <p className="text-xs text-forge-400 font-mono mt-0.5">{result.content}</p>
                </div>
              </div>
            )}

            {result.type === 'error' && (
              <div className="card p-4 border-red-500/30 flex items-center gap-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-red-400 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
                </svg>
                <p className="text-sm text-red-300">{result.content}</p>
              </div>
            )}

            <button
              onClick={handleStart}
              className="btn-secondary mt-4"
            >
              Record Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
