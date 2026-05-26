import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, X, Send, Loader2, RotateCcw, Sparkles } from 'lucide-react';
import { askTravelAssistant } from '../services/assistantService';

/* ══════════════════════════════════════════════
   Quick questions
═══════════════════════════════════════════════ */
const QUICK_QUESTIONS = [
  { emoji: '🌍', text: 'Avrupa için en iyi 3 şehir?' },
  { emoji: '💶', text: '1.000€ ile nereye gidebilirim?' },
  { emoji: '☀️', text: 'Ocak\'ta sıcak tatil yerleri?' },
  { emoji: '🎒', text: 'Solo seyahat için neresi ideal?' },
  { emoji: '🛂', text: 'Türk pasaportu ile vizesiz ülkeler?' },
  { emoji: '💑', text: 'Balayı için en romantik destinasyonlar?' },
];

const FOLLOW_UP_CHIPS = [
  'Daha detay ver',
  'Bütçe ne olmalı?',
  'En iyi ay hangisi?',
  'Otel mi Airbnb mi?',
];

/* ══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
interface Message {
  id:       string;
  role:     'user' | 'assistant';
  text:     string;
  loading?: boolean;
}

/* ══════════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════════ */

/* Typing dots */
const TypingDots: React.FC = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 150, 300].map(delay => (
      <div
        key={delay}
        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
        style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
      />
    ))}
  </div>
);

/* Message bubble */
const MessageBubble: React.FC<{ msg: Message }> = ({ msg }) => {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f8981d] to-[#e08518] flex items-center justify-center flex-shrink-0 mb-0.5 shadow-sm">
          <Bot size={12} className="text-white" />
        </div>
      )}
      <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
        isUser
          ? 'bg-gradient-to-br from-[#f8981d] to-[#e08518] text-white rounded-br-sm'
          : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm'
      }`}>
        {msg.loading ? <TypingDots /> : (
          <p className="whitespace-pre-wrap">{msg.text}</p>
        )}
      </div>
    </div>
  );
};

/* Welcome screen */
const WelcomeScreen: React.FC<{ onQuestion: (q: string) => void }> = ({ onQuestion }) => (
  <div className="h-full flex flex-col justify-center px-4 py-6 gap-5">
    {/* Hero */}
    <div className="text-center">
      <div className="text-5xl mb-3">🌐</div>
      <p className="text-sm font-bold text-slate-800">Seyahat asistanınım!</p>
      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
        Destinasyon, bütçe, vize — her şeyi sor.
      </p>
    </div>

    {/* Quick question grid */}
    <div className="grid grid-cols-2 gap-2">
      {QUICK_QUESTIONS.map(q => (
        <button
          key={q.text}
          onClick={() => onQuestion(q.text)}
          className="flex items-start gap-2 text-left bg-slate-50 hover:bg-[#f8981d]/8 border border-slate-200 hover:border-[#f8981d]/30 rounded-xl p-3 transition-all group"
        >
          <span className="text-base leading-none flex-shrink-0 mt-0.5">{q.emoji}</span>
          <span className="text-[11px] font-medium text-slate-700 group-hover:text-slate-900 leading-tight">
            {q.text}
          </span>
        </button>
      ))}
    </div>
  </div>
);

/* ══════════════════════════════════════════════
   Main Widget
═══════════════════════════════════════════════ */
export const AiAssistantWidget: React.FC = () => {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  /* Auto-scroll to latest message */
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open]);

  /* Focus input when panel opens */
  useEffect(() => {
    if (open && messages.length > 0) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, messages.length]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsgId = `u-${Date.now()}`;
    const aiMsgId   = `a-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: 'user',      text: trimmed },
      { id: aiMsgId,   role: 'assistant', text: '',    loading: true },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      await askTravelAssistant(trimmed, (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, text: chunk, loading: false } : m
        ));
      });
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, text: 'Üzgünüm, bir hata oluştu. Tekrar dene. 🙏', loading: false }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 select-none">

      {/* ── Chat Panel ── */}
      {open && (
        <div
          ref={panelRef}
          className="w-[340px] sm:w-[370px] bg-[#fafafa] rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden"
          style={{ height: '500px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#f8981d] to-[#e08518] px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">Travyon AI</p>
                <p className="text-white/70 text-[10px] leading-tight">Seyahat asistanı</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {hasMessages && (
                <button
                  onClick={() => setMessages([])}
                  title="Sohbeti temizle"
                  className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 rounded-full transition-all"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 rounded-full transition-all"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages / Welcome */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {!hasMessages
              ? <WelcomeScreen onQuestion={sendMessage} />
              : <>
                  {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                  <div ref={bottomRef} />
                </>
            }
          </div>

          {/* Follow-up chips (only during conversation) */}
          {hasMessages && (
            <div className="px-3 pb-1 pt-2 flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden flex-shrink-0">
              {FOLLOW_UP_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  disabled={isLoading}
                  className="flex-shrink-0 text-[10px] font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="px-3 pb-3 pt-2 flex gap-2 flex-shrink-0 border-t border-slate-100">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Bir şey sor…"
              disabled={isLoading}
              className="flex-1 text-sm bg-white border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-[#f8981d] focus:ring-2 focus:ring-[#f8981d]/10 transition-all placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f8981d] to-[#e08518] text-white flex items-center justify-center hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isLoading
                ? <Loader2 size={15} className="animate-spin" />
                : <Send size={15} />
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-14 h-14 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-br from-[#f8981d] to-[#e08518] text-white"
        aria-label="AI Asistanı"
      >
        {open ? <X size={22} /> : <Bot size={22} />}

        {/* Pulse ring (when closed, no conversation) */}
        {!open && !hasMessages && (
          <span className="absolute inset-0 rounded-full bg-[#f8981d] opacity-30 animate-ping pointer-events-none" />
        )}
      </button>
    </div>
  );
};
