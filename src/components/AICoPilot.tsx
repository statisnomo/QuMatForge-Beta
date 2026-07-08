import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, Sparkles, Cpu } from 'lucide-react';
import type { Material } from '../types';

interface AICoPilotProps {
  mode: 'spin' | 'photonic';
  onAddCustomMaterial: (material: Material) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  parsedMaterial?: Material | null;
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: `**Welcome to the QuMat AI Co-Pilot.**

I'm your dedicated research assistant for quantum material discovery. I can help you with:

• Analyzing crystal structures & predicting qubit host suitability
• Running DFT-informed property estimations
• Designing custom materials for spin or photonic qubits
• Comparing candidate materials across key metrics

Try asking me something like:

_"Analyze SiC as a spin-qubit host and estimate coherence times"_
_"Design a wide band-gap crystal with low nuclear spin noise"_
_"Compare diamond NV centers vs silicon carbide for photonic integration"_

What would you like to explore?`,
};

function extractJsonMaterial(text: string): Material | null {
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/;
  const match = text.match(jsonBlockRegex);
  if (!match || !match[1]) return null;

  try {
    const parsed = JSON.parse(match[1].trim());
    // Validate it has at least the required Material fields
    if (parsed && typeof parsed.name === 'string' && typeof parsed.formula === 'string') {
      return {
        id: parsed.id || `custom-${Date.now()}`,
        name: parsed.name,
        formula: parsed.formula,
        category: parsed.category || 'AI-Generated',
        crystalSystem: parsed.crystalSystem || 'Unknown',
        spaceGroup: parsed.spaceGroup || 'N/A',
        bandGapEv: parsed.bandGapEv ?? 0,
        formationEnergyEvPerAtom: parsed.formationEnergyEvPerAtom ?? 0,
        debyeTemperatureK: parsed.debyeTemperatureK ?? 0,
        suitabilityScore: parsed.suitabilityScore ?? 0,
        coherenceT2Estimated: parsed.coherenceT2Estimated || 'N/A',
        nuclearSpinBackgroundScore: parsed.nuclearSpinBackgroundScore ?? 0,
        pros: parsed.pros || [],
        cons: parsed.cons || [],
        synthesisMethodRecommended: parsed.synthesisMethodRecommended || 'N/A',
        scientificReasoning: parsed.scientificReasoning || '',
        isCustom: true,
        mode: parsed.mode,
        squeezingDb: parsed.squeezingDb,
        refractiveIndex: parsed.refractiveIndex,
        piezoelectricModulus: parsed.piezoelectricModulus,
        transmissivity: parsed.transmissivity,
        photonicScore: parsed.photonicScore,
        rEstimated: parsed.rEstimated,
        latticeParameters: parsed.latticeParameters,
        defectCharacteristics: parsed.defectCharacteristics,
      } as Material;
    }
  } catch {
    // JSON parse failed — not a valid material block
  }
  return null;
}

export default function AICoPilot({ mode, onAddCustomMaterial }: AICoPilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new/updated messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(async () => {
    const userMessage = input.trim();
    if (!userMessage || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);

    try {
      const history = [...messages.slice(-10), userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch('/api/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, mode, history }),
      });

      if (!response.body) {
        setIsStreaming(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.substring(6);
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'token') {
                accumulated += data.content;
                const materialCandidate = extractJsonMaterial(accumulated);
                setMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: accumulated,
                    parsedMaterial: materialCandidate,
                  };
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }

      // Final parse for material after stream completes
      const finalMaterial = extractJsonMaterial(accumulated);
      if (finalMaterial) {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          updated[lastIdx] = {
            ...updated[lastIdx],
            parsedMaterial: finalMaterial,
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Co-Pilot streaming error:', err);
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          content: 'An error occurred while communicating with the AI backend. Please try again.',
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const renderMessageContent = (content: string) => {
    // Simple markdown-lite renderer for bold, italic, and line breaks
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Process bold **text**
      let parts: (string | React.ReactNode)[] = [line];

      // Bold
      parts = parts.flatMap((part, pi) => {
        if (typeof part !== 'string') return [part];
        const segments: (string | React.ReactNode)[] = [];
        const boldRegex = /\*\*(.*?)\*\*/g;
        let lastIndex = 0;
        let match;
        while ((match = boldRegex.exec(part)) !== null) {
          if (match.index > lastIndex) segments.push(part.slice(lastIndex, match.index));
          segments.push(<strong key={`b-${i}-${pi}-${match.index}`} className="text-slate-100 font-semibold">{match[1]}</strong>);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < part.length) segments.push(part.slice(lastIndex));
        return segments.length > 0 ? segments : [part];
      });

      // Italic _text_
      parts = parts.flatMap((part, pi) => {
        if (typeof part !== 'string') return [part];
        const segments: (string | React.ReactNode)[] = [];
        const italicRegex = /_(.*?)_/g;
        let lastIndex = 0;
        let match;
        while ((match = italicRegex.exec(part)) !== null) {
          if (match.index > lastIndex) segments.push(part.slice(lastIndex, match.index));
          segments.push(<em key={`i-${i}-${pi}-${match.index}`} className="text-cyan-300/90 not-italic font-mono text-xs">{match[1]}</em>);
          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < part.length) segments.push(part.slice(lastIndex));
        return segments.length > 0 ? segments : [part];
      });

      // Bullet points
      const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-');

      return (
        <span key={i} className={`block ${isBullet ? 'pl-2' : ''} ${line === '' ? 'h-3' : ''}`}>
          {parts}
        </span>
      );
    });
  };

  return (
    <div className="w-full min-h-[calc(100vh-14rem)] flex flex-col bg-[#0A0B10] rounded-xl border border-slate-800 overflow-hidden">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0D0F16] border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 leading-tight">QuMat AI Co-Pilot</h2>
            <p className="text-[10px] text-slate-500 font-mono leading-tight">Active Crystalline Database &amp; DFT Solver</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-[10px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Groq Llama 3.3
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/5 border border-cyan-500/20 text-[10px] font-mono text-cyan-400 tracking-wider">
            <Cpu className="w-3 h-3" />
            SOLVER READY
          </span>
        </div>
      </div>

      {/* ─── Messages ─── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isEmptyAssistant = msg.role === 'assistant' && msg.content === '' && isStreaming;

          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              {/* Assistant avatar */}
              {!isUser && (
                <div className="flex-shrink-0 mt-1 mr-2.5">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>
              )}

              <div className={`max-w-[85%] ${isUser
                ? 'bg-cyan-500/10 border border-cyan-500/20 rounded-2xl rounded-br-md'
                : 'bg-slate-800/40 border border-slate-700/50 rounded-2xl rounded-bl-md'
              } px-4 py-3`}>
                {isEmptyAssistant ? (
                  /* Typing indicator */
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/70 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/70 animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/70 animate-bounce [animation-delay:300ms]" />
                  </div>
                ) : (
                  <>
                    <div className={`text-sm leading-relaxed ${isUser ? 'text-slate-200' : 'text-slate-300'}`}>
                      {renderMessageContent(msg.content)}
                    </div>

                    {/* Add to Explorer button for parsed materials */}
                    {msg.parsedMaterial && (
                      <button
                        onClick={() => onAddCustomMaterial(msg.parsedMaterial!)}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono
                                   hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all duration-200 group"
                      >
                        <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                        Add to Explorer
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ─── Input Bar ─── */}
      <div className="px-4 py-3 bg-[#0D0F16] border-t border-slate-800">
        <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-1.5
                        focus-within:border-cyan-500/40 focus-within:bg-slate-800/70 transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Specify crystal formulas, properties, or qubit requirements..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 outline-none font-mono
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSubmit}
            disabled={isStreaming || !input.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30
                       text-cyan-400 hover:bg-cyan-500/25 hover:border-cyan-400/50 disabled:opacity-30
                       disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
