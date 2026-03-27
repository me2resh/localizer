import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { checkStatus, fetchModels } from './lib/api';
import Sidebar from './components/Sidebar';
import ProcessView from './components/ProcessView';
import ChatView from './components/ChatView';
import ReplyView from './components/ReplyView';
import SpeakView from './components/SpeakView';
import RecordView from './components/RecordView';
import SetupView from './components/SetupView';

const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

const VIEWS = {
  process: ProcessView,
  chat: ChatView,
  reply: ReplyView,
  speak: SpeakView,
  record: RecordView,
  setup: SetupView,
};

export default function App() {
  const [view, setView] = useState('process');
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [models, setModels] = useState([]);

  const refreshModels = useCallback(async () => {
    try {
      const m = await fetchModels();
      setModels(m);
    } catch {
      setModels([]);
    }
  }, []);

  useEffect(() => {
    let interval;

    async function poll() {
      try {
        const { status } = await checkStatus();
        setOllamaStatus(status);
        if (status === 'running') refreshModels();
      } catch {
        setOllamaStatus('offline');
      }
    }

    poll();
    interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [refreshModels]);

  const ActiveView = VIEWS[view];

  return (
    <AppContext.Provider value={{ ollamaStatus, models, refreshModels }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar active={view} onNavigate={setView} status={ollamaStatus} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-10">
            <ActiveView />
          </div>
        </main>
      </div>
    </AppContext.Provider>
  );
}
