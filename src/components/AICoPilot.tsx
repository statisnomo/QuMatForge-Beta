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

  // Render inline markdown (bold, italic) for a single line
  const renderInlineMd = (line: string, lineIdx: number) => {
    let parts: (string | React.ReactNode)[] = [line];

    // Bold **text**
    parts = parts.flatMap((part, pi) => {
      if (typeof part !== 'string') return [part];
      const segments: (string | React.ReactNode)[] = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;
      while ((match = boldRegex.exec(part)) !== null) {
        if (match.index > lastIndex) segments.push(part.slice(lastIndex, match.index));
        segments.push(<strong key={`b-${lineIdx}-${pi}-${match.index}`} className="text-slate-100 font-semibold">{match[1]}</strong>);
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
        segments.push(<em key={`i-${lineIdx}-${pi}-${match.index}`} className="text-cyan-300/90 not-italic font-mono text-xs">{match[1]}</em>);
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < part.length) segments.push(part.slice(lastIndex));
      return segments.length > 0 ? segments : [part];
    });

    return parts;
  };

  // Render a parsed Material JSON as a styled properties card
  const renderMaterialCard = (mat: Record<string, any>, key: string) => {
    const score = mat.suitabilityScore ?? 0;
    const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
    const scoreBg = score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : score >= 50 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-rose-500/10 border-rose-500/20';

    return (
      <div key={key} className="my-3 bg-[#0D0F16] border border-slate-700/60 rounded-xl overflow-hidden">
        {/* Card header */}
        <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100 font-mono">{mat.formula || 'Unknown'}</p>
              <p className="text-[10px] text-slate-400">{mat.name || mat.formula}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full border text-xs font-bold font-mono ${scoreBg} ${scoreColor}`}>
            {score}%
          </div>
        </div>

        {/* Properties grid */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {mat.crystalSystem && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Crystal System</p>
              <p className="text-xs text-slate-200 font-mono">{mat.crystalSystem}</p>
            </div>
          )}
          {mat.spaceGroup && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Space Group</p>
              <p className="text-xs text-slate-200 font-mono">{mat.spaceGroup}</p>
            </div>
          )}
          {mat.bandGapEv !== undefined && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Band Gap</p>
              <p className="text-xs text-cyan-400 font-mono font-bold">{mat.bandGapEv} eV</p>
            </div>
          )}
          {mat.formationEnergyEvPerAtom !== undefined && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Formation Energy</p>
              <p className="text-xs text-slate-200 font-mono">{mat.formationEnergyEvPerAtom} eV/atom</p>
            </div>
          )}
          {mat.debyeTemperatureK !== undefined && mat.debyeTemperatureK > 0 && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Debye Temp</p>
              <p className="text-xs text-slate-200 font-mono">{mat.debyeTemperatureK} K</p>
            </div>
          )}
          {mat.coherenceT2Estimated && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Coherence T₂</p>
              <p className="text-xs text-slate-200 font-mono">{mat.coherenceT2Estimated}</p>
            </div>
          )}
          {mat.category && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Category</p>
              <p className="text-xs text-slate-200">{mat.category}</p>
            </div>
          )}
          {mat.nuclearSpinBackgroundScore !== undefined && (
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider">Nuclear Spin Score</p>
              <p className="text-xs text-slate-200 font-mono">{mat.nuclearSpinBackgroundScore}/100</p>
            </div>
          )}
        </div>

        {/* Pros / Cons */}
        {(mat.pros?.length > 0 || mat.cons?.length > 0) && (
          <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mat.pros?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-emerald-400/80 uppercase font-mono tracking-wider font-bold">Advantages</p>
                {mat.pros.map((p: string, i: number) => (
                  <p key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">✓</span> {p}
                  </p>
                ))}
              </div>
            )}
            {mat.cons?.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] text-amber-400/80 uppercase font-mono tracking-wider font-bold">Challenges</p>
                {mat.cons.map((c: string, i: number) => (
                  <p key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">⚠</span> {c}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Synthesis & Reasoning */}
        {(mat.synthesisMethodRecommended || mat.scientificReasoning) && (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-800/60 pt-3">
            {mat.synthesisMethodRecommended && (
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider mb-0.5">Synthesis Method</p>
                <p className="text-[11px] text-slate-400 italic">{mat.synthesisMethodRecommended}</p>
              </div>
            )}
            {mat.scientificReasoning && (
              <div>
                <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider mb-0.5">Scientific Reasoning</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">{mat.scientificReasoning}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMessageContent = (content: string) => {
    // Split content into segments: text and ```json blocks
    const segments: { type: 'text' | 'json'; content: string }[] = [];
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = jsonBlockRegex.exec(content)) !== null) {
      // Text before the JSON block
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'json', content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last JSON block
    if (lastIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return segments.map((seg, segIdx) => {
      if (seg.type === 'json') {
        // Try to parse and render as material card
        try {
          const parsed = JSON.parse(seg.content);
          if (parsed && (parsed.formula || parsed.name)) {
            return renderMaterialCard(parsed, `mat-${segIdx}`);
          }
        } catch {
          // If JSON is malformed (still streaming), show a subtle loading indicator
          return (
            <div key={`json-${segIdx}`} className="my-2 px-3 py-2 bg-slate-800/30 border border-slate-700/40 rounded-lg">
              <p className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-pulse" />
                Generating material analysis...
              </p>
            </div>
          );
        }
      }

      // Render text segment with inline markdown
      const lines = seg.content.split('\n');
      return (
        <span key={`text-${segIdx}`}>
          {lines.map((line, i) => {
            const isBullet = line.trimStart().startsWith('•') || line.trimStart().startsWith('-');
            return (
              <span key={i} className={`block ${isBullet ? 'pl-2' : ''} ${line === '' ? 'h-3' : ''}`}>
                {renderInlineMd(line, i)}
              </span>
            );
          })}
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
