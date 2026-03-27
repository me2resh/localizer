import { useState, useRef, useEffect } from 'react';
import { streamChat, uploadFiles } from '../lib/api';
import FileDropzone from './FileDropzone';
import ModelSelector from './ModelSelector';

export default function ChatView() {
  const [files, setFiles] = useState([]);
  const [fileContext, setFileContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [model, setModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleFilesChange(newFiles) {
    setFiles(newFiles);
    if (!newFiles.length) {
      setFileContext('');
      return;
    }
    setContextLoading(true);
    try {
      const contents = await uploadFiles(newFiles);
      setFileContext(
        contents.map((c) => `--- ${c.name} ---\n${c.data}`).join('\n\n')
      );
    } catch {
      setFileContext('');
    }
    setContextLoading(false);
  }

  async function sendMessage(e) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isStreaming || !model) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setIsStreaming(true);

    try {
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      for await (const chunk of streamChat(model, apiMessages, fileContext)) {
        if (chunk.error) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: updated[updated.length - 1].content + '\n\nError: ' + chunk.error,
            };
            return updated;
          });
          break;
        }
        if (chunk.token) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: updated[updated.length - 1].content + chunk.token,
            };
            return updated;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Connection error: ' + err.message,
        };
        return updated;
      });
    }

    setIsStreaming(false);
    inputRef.current?.focus();
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div className="animate-fade-in flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="shrink-0">
        <h1 className="view-header">Chat</h1>
        <p className="view-subtitle">Ask questions about your files</p>
      </div>

      {/* Setup row */}
      {messages.length === 0 && (
        <div className="shrink-0 space-y-5 mb-6 animate-slide-up">
          <div>
            <label className="label">Context Files (optional)</label>
            <FileDropzone files={files} onFilesChange={handleFilesChange} compact />
            {contextLoading && (
              <p className="text-xs text-ember mt-2 font-mono">Reading files...</p>
            )}
            {fileContext && !contextLoading && (
              <p className="text-xs text-jade mt-2 font-mono">
                {files.length} file{files.length > 1 ? 's' : ''} loaded as context
              </p>
            )}
          </div>
          <div>
            <label className="label">Model</label>
            <ModelSelector value={model} onChange={setModel} />
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto space-y-4 min-h-0 pb-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-forge-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-16 h-16 mx-auto mb-4 opacity-30">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              <p className="text-sm">Select a model and start chatting</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isLast = i === messages.length - 1;
          return (
            <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`
                  max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed animate-fade-in
                  ${
                    isUser
                      ? 'bg-ember/20 text-forge-50 border border-ember/20 rounded-br-md'
                      : 'bg-forge-800 text-forge-200 border border-forge-600/30 rounded-bl-md'
                  }
                  ${!isUser && isLast && isStreaming ? 'streaming-cursor' : ''}
                `}
              >
                <div className="whitespace-pre-wrap">{msg.content || '\u200B'}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 border-t border-forge-600/30">
        {messages.length > 0 && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 px-2 py-1 bg-forge-800 rounded-md border border-forge-600/30">
              <span className="w-1.5 h-1.5 rounded-full bg-jade" />
              <span className="text-xs text-forge-400 font-mono">{model}</span>
            </div>
            {fileContext && (
              <span className="text-xs text-forge-400 font-mono">
                {files.length} file{files.length > 1 ? 's' : ''} in context
              </span>
            )}
            <button onClick={clearChat} className="btn-ghost text-xs ml-auto">
              Clear
            </button>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex gap-3">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={model ? 'Ask a question...' : 'Select a model first'}
            disabled={!model || isStreaming}
            className="input-field flex-1"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || !model || isStreaming}
            className="btn-primary px-4"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
