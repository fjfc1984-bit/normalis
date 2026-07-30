'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import AuthGuard from '@/components/auth/AuthGuard';

const WORKER_URL = 'https://normalis.fjfc1984.workers.dev';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

function ChatContent() {
  const { nombre } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: '¡Hola! Soy el asistente de NormaLis. Puedo ayudarte con preguntas sobre habilitación (Resolución 3100/2019 y 465/2025), PAMEC, SG-SST y calidad en salud. ¿En qué puedo ayudarte?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const question = input.trim();
    if (!question || loading) return;

    const userMsg: Message = { role: 'user', text: question };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError('');

    // Construir historial para el Worker (últimas 6 turns)
    const sessionHistory = updatedMessages.slice(-6).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      text: m.text,
    }));

    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionHistory }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || `Error ${res.status}`);
      }

      setMessages(prev => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setError(msg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Lo siento, ocurrió un error al procesar tu consulta. Intenta de nuevo.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <h2 className="text-lg font-semibold text-gray-800">Asistente IA NormaLis</h2>
        <p className="text-xs text-gray-500">
          Consultas sobre Res. 3100/2019, 465/2025, PAMEC y SG-SST
          {nombre ? ` · ${nombre}` : ''}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                ${msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                }`}
            >
              {msg.role === 'assistant' && (
                <span className="block text-xs font-semibold text-primary-600 mb-1">
                  NormaLis IA
                </span>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
              <span className="text-xs font-semibold text-primary-600 block mb-1">NormaLis IA</span>
              <span className="flex gap-1">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
                       min-h-[44px] max-h-32"
            placeholder="Pregunta sobre habilitación, PAMEC, SG-SST..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
          >
            Enviar
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Enter para enviar · Shift+Enter para salto de línea
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}
