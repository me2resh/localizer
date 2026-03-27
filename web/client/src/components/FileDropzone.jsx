import { useState, useRef, useCallback } from 'react';

export default function FileDropzone({ files, onFilesChange, compact = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length) onFilesChange([...files, ...dropped]);
    },
    [files, onFilesChange]
  );

  const handleSelect = useCallback(
    (e) => {
      const selected = Array.from(e.target.files);
      if (selected.length) onFilesChange([...files, ...selected]);
      e.target.value = '';
    },
    [files, onFilesChange]
  );

  const removeFile = useCallback(
    (index) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-200
          ${compact ? 'px-4 py-4' : 'px-6 py-8'}
          ${
            isDragOver
              ? 'border-ember bg-ember-glow scale-[1.01]'
              : 'border-forge-600/50 hover:border-forge-500 hover:bg-forge-800/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          onChange={handleSelect}
          className="hidden"
        />

        <div className={`flex flex-col items-center ${compact ? 'gap-1' : 'gap-3'}`}>
          <div className={`rounded-full bg-forge-750 ${compact ? 'p-2' : 'p-3'}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-forge-400 ${compact ? 'w-5 h-5' : 'w-6 h-6'}`}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {compact ? (
            <p className="text-sm text-forge-400">
              Drop files or <span className="text-ember">browse</span>
            </p>
          ) : (
            <>
              <div className="text-center">
                <p className="text-forge-200 font-medium">
                  Drop files here or <span className="text-ember hover:text-ember-light">browse</span>
                </p>
                <p className="text-xs text-forge-400 mt-1">
                  Text, code, PDF, images — up to 50 MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 px-3 py-2 bg-forge-800/50 rounded-lg border border-forge-600/30 animate-fade-in"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-forge-400 shrink-0">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-forge-200 truncate flex-1">{file.name}</span>
              <span className="text-xs text-forge-400 font-mono shrink-0">{formatSize(file.size)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="p-0.5 text-forge-400 hover:text-red-400 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
