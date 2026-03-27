const NAV_ITEMS = [
  {
    id: 'process',
    label: 'Process',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-3.5-6.5L15 7m-6 10l-1.5 1.5M18.5 18.5L17 17M7 7L5.5 5.5" strokeLinecap="round" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'reply',
    label: 'Reply',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M9 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 12h11a5 5 0 010 10h-1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'speak',
    label: 'Speak',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M11 5L6 9H2v6h4l5 4V5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'record',
    label: 'Record',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  { id: 'divider' },
  {
    id: 'setup',
    label: 'Setup',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const STATUS_COLORS = {
  running: 'bg-jade',
  checking: 'bg-forge-400 animate-pulse',
  offline: 'bg-red-500',
  error: 'bg-yellow-500',
};

const STATUS_LABELS = {
  running: 'Ollama Online',
  checking: 'Checking...',
  offline: 'Ollama Offline',
  error: 'Ollama Error',
};

export default function Sidebar({ active, onNavigate, status }) {
  return (
    <aside className="w-60 h-screen flex flex-col bg-forge-900 border-r border-forge-600/40 shrink-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-ember to-ember-dark flex items-center justify-center shadow-lg shadow-ember/20">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="font-display font-bold text-forge-50 text-lg leading-tight tracking-tight">
              Localizer
            </h1>
            <p className="text-[11px] text-forge-400 font-mono tracking-wider uppercase">
              Local LLM Tool
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          if (item.id === 'divider') {
            return <div key="divider" className="my-3 mx-2 border-t border-forge-600/30" />;
          }

          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-all duration-150 group
                ${
                  isActive
                    ? 'bg-ember-glow text-ember-light border border-ember/20'
                    : 'text-forge-300 hover:text-forge-100 hover:bg-forge-800/60 border border-transparent'
                }
              `}
            >
              <span className={`transition-colors ${isActive ? 'text-ember' : 'text-forge-400 group-hover:text-forge-200'}`}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Status */}
      <div className="px-4 py-4 border-t border-forge-600/30">
        <div className="flex items-center gap-2.5 px-1">
          <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]} shrink-0`} />
          <span className="text-xs text-forge-400 font-mono">{STATUS_LABELS[status]}</span>
        </div>
      </div>
    </aside>
  );
}
