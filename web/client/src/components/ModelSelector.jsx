import { useApp } from '../App';

function formatSize(bytes) {
  if (!bytes) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? gb.toFixed(1) + ' GB' : (bytes / (1024 * 1024)).toFixed(0) + ' MB';
}

export default function ModelSelector({ value, onChange }) {
  const { models, ollamaStatus } = useApp();

  if (ollamaStatus !== 'running') {
    return (
      <div className="input-field flex items-center gap-2 opacity-60">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-red-400">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
        </svg>
        <span className="text-sm text-forge-400">Ollama offline</span>
      </div>
    );
  }

  if (!models.length) {
    return (
      <div className="input-field flex items-center gap-2 opacity-60">
        <span className="text-sm text-forge-400">No models available — pull one in Setup</span>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input-field appearance-none bg-[length:20px] bg-[right_12px_center] bg-no-repeat cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235c5c68' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
      }}
    >
      <option value="">Select a model...</option>
      {models.map((m) => (
        <option key={m.name} value={m.name}>
          {m.name} {formatSize(m.size) ? `(${formatSize(m.size)})` : ''}
        </option>
      ))}
    </select>
  );
}
