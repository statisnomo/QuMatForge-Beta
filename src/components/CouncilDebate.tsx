import React, { useState, useEffect, useRef } from 'react';
import { Gavel, Bot, Zap, BrainCircuit, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CouncilDebateProps {
  formula: string;
  inputData: any;
  onComplete?: () => void;
}

export function CouncilDebate({ formula, inputData, onComplete }: CouncilDebateProps) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [mlScores, setMlScores] = useState<any>(null);
  const [isDebating, setIsDebating] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mlScores]);

  useEffect(() => {
    let currentRole = 'system';
    let currentContent = '';
    
    const startDebate = async () => {
      try {
        const response = await fetch('/api/council-debate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formula, input_data: inputData })
        });
        
        if (!response.body) return;
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
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
                setIsDebating(false);
                if (onComplete) onComplete();
                continue;
              }
              
              try {
                const data = JSON.parse(dataStr);
                
                if (data.type === 'models') {
                  setMlScores(data.data);
                } else if (data.type === 'token') {
                  currentContent += data.content;
                  
                  // Flexible parsing logic for agent tags - handle with/without closing tags
                  const rfMatch = currentContent.match(/<agent_rf>\s*([\s\S]*?)(?:<\/agent_rf>|<agent_gb>|<agent_xgb>|<judge>|$)/i);
                  const gbMatch = currentContent.match(/<agent_gb>\s*([\s\S]*?)(?:<\/agent_gb>|<agent_rf>|<agent_xgb>|<judge>|$)/i);
                  const xgbMatch = currentContent.match(/<agent_xgb>\s*([\s\S]*?)(?:<\/agent_xgb>|<agent_rf>|<agent_gb>|<judge>|$)/i);
                  const judgeMatch = currentContent.match(/<judge>\s*([\s\S]*?)(?:<\/judge>|$)/i);
                  
                  const newMsgs = [];
                  if (rfMatch && rfMatch[1].trim()) newMsgs.push({ role: 'Random Forest', content: rfMatch[1].trim() });
                  if (gbMatch && gbMatch[1].trim()) newMsgs.push({ role: 'Gradient Boosting', content: gbMatch[1].trim() });
                  if (xgbMatch && xgbMatch[1].trim()) newMsgs.push({ role: 'XGBoost', content: xgbMatch[1].trim() });
                  if (judgeMatch && judgeMatch[1].trim()) newMsgs.push({ role: 'Judge', content: judgeMatch[1].trim() });
                  
                  // If no tags parsed yet but we have content, show it as system
                  if (newMsgs.length === 0 && currentContent.trim().length > 20) {
                    // Strip any leading tag markers that haven't completed yet
                    const cleanContent = currentContent.replace(/<\/?agent_\w*>?/gi, '').replace(/<\/?judge>?/gi, '').trim();
                    if (cleanContent) {
                      newMsgs.push({ role: 'Random Forest', content: cleanContent });
                    }
                  }
                  
                  if (newMsgs.length > 0) {
                    setMessages(newMsgs);
                  }
                } else if (data.type === 'error') {
                  console.error("Backend returned error:", data.message);
                  setErrorMsg(data.message);
                  setIsDebating(false);
                }
              } catch (e) {
                console.error("Parse error stream chunk", e);
              }
            }
          }
        }
      } catch (err) {
        console.error("Debate error:", err);
      } finally {
        setIsDebating(false);
      }
    };
    
    startDebate();
  }, [formula, inputData]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Random Forest': return <BrainCircuit className="w-5 h-5 text-emerald-400" />;
      case 'Gradient Boosting': return <Activity className="w-5 h-5 text-amber-400" />;
      case 'XGBoost': return <Zap className="w-5 h-5 text-rose-400" />;
      case 'Judge': return <Gavel className="w-6 h-6 text-indigo-400" />;
      default: return <Bot className="w-5 h-5 text-slate-400" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Random Forest': return "border-emerald-500/30 bg-emerald-500/10";
      case 'Gradient Boosting': return "border-amber-500/30 bg-amber-500/10";
      case 'XGBoost': return "border-rose-500/30 bg-rose-500/10";
      case 'Judge': return "border-indigo-500/50 bg-indigo-500/20";
      default: return "border-slate-700 bg-slate-800/50";
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gavel className="w-6 h-6 text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-100">Council of Agents Deliberation</h2>
        </div>
        <div className="flex items-center gap-2">
          {isDebating && (
            <span className="flex items-center gap-2 text-sm text-indigo-400 font-mono animate-pulse">
              <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
              Debating {formula}...
            </span>
          )}
        </div>
      </div>
      
      {/* ML Model Pre-Scores */}
      <div className="flex bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex-1 p-3 text-center border-r border-slate-700/50">
          <div className="text-xs text-slate-400 font-mono mb-1">Random Forest Pred</div>
          <div className="text-lg font-bold text-emerald-400">
            {mlScores ? mlScores.RandomForest.toFixed(3) : "..."}
          </div>
        </div>
        <div className="flex-1 p-3 text-center border-r border-slate-700/50">
          <div className="text-xs text-slate-400 font-mono mb-1">Gradient Boost Pred</div>
          <div className="text-lg font-bold text-amber-400">
             {mlScores ? mlScores.GradientBoosting.toFixed(3) : "..."}
          </div>
        </div>
        <div className="flex-1 p-3 text-center">
          <div className="text-xs text-slate-400 font-mono mb-1">XGBoost Pred</div>
          <div className="text-lg font-bold text-rose-400">
             {mlScores ? mlScores.XGBoost.toFixed(3) : "..."}
          </div>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl">
            <h3 className="font-bold mb-2">API Error Occurred</h3>
            <p className="text-sm">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {!errorMsg && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${getRoleColor(msg.role)}`}
              >
                <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2">
                  {getRoleIcon(msg.role)}
                  <span className="font-bold text-slate-200">{msg.role}</span>
                </div>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} className="h-4" />
        </div>
      )}
    </div>
  );
}
