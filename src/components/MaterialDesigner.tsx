import React, { useState } from "react";
import { DesignResult, DesignProposal, Material } from "../types";
import { Sparkles, Loader2, Compass, AlertCircle, Check, Import, BrainCircuit } from "lucide-react";

interface MaterialDesignerProps {
  onAddCustomMaterial: (material: Material) => void;
  mode: "spin" | "photonic";
}

export default function MaterialDesigner({ onAddCustomMaterial, mode }: MaterialDesignerProps) {
  const [specs, setSpecs] = useState("");
  const [thinkingMode, setThinkingMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [designResult, setDesignResult] = useState<DesignResult | null>(null);
  const [importedIndices, setImportedIndices] = useState<number[]>([]);

  const handleDesignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!specs.trim()) {
      setError("Please describe your quantum device parameters or target material requirements.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setDesignResult(null);
    setImportedIndices([]);

    try {
      const response = await fetch("/api/design-material", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetSpecs: specs.trim(),
          thinkingMode,
          mode,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Materials design generation failed.");
      }

      const data: DesignResult = await response.json();
      setDesignResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "A network error occurred during design generation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportProposal = (proposal: DesignProposal, index: number) => {
    // Convert Design Proposal into a fully qualified Material object
    const debyeK = proposal.estimatedTcK > 150 ? proposal.estimatedTcK : 500; // sensible guess or use estimatedTcK as debye
    
    const formattedMaterial: Material = {
      id: `designed-${Date.now()}-${index}`,
      name: `${proposal.crystalSystem} Quantum Proposal`,
      formula: proposal.formula,
      category: specs.toLowerCase().includes("superconduct") ? "Superconducting Qubit" : "Spin Qubit / Color Center",
      crystalSystem: proposal.crystalSystem,
      spaceGroup: "P-3m1 (Assumed)",
      bandGapEv: specs.toLowerCase().includes("superconduct") ? 0.0 : 3.0,
      formationEnergyEvPerAtom: -0.85,
      debyeTemperatureK: debyeK,
      suitabilityScore: 85,
      coherenceT2Estimated: specs.toLowerCase().includes("superconduct") ? `${proposal.estimatedTcK}K Critical Temp` : "1.2 ms (estimated)",
      nuclearSpinBackgroundScore: 80,
      pros: [proposal.keyAdvantage, "Highly compatible with requested device constraints"],
      cons: [`Synthesis difficulty: ${proposal.synthesisDifficulty}`, `Requires specialized substrate: ${proposal.substrateCompatibility || "N/A"}`],
      latticeParameters: { a: 4.12, b: 4.12, c: 4.12, alpha: 90, beta: 90, gamma: 90 },
      synthesisMethodRecommended: `Specialized crystal synthesis targeting: ${proposal.substrateCompatibility || "SOI / Sapphire"} substrates.`,
      scientificReasoning: proposal.suitabilityJustification,
      isCustom: true
    };

    onAddCustomMaterial(formattedMaterial);
    setImportedIndices((prev) => [...prev, index]);
  };

  const handleQuickSpec = (text: string) => {
    setSpecs(text);
  };

  return (
    <div className="space-y-6">
      {/* Designer intro */}
      <div className="bg-[#0D0F16]/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">Quantum Materials AI Designer</h2>
            <p className="text-xs text-slate-400">Describe physical device specs and let the AI propose stable candidate crystal systems</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Specifications entry */}
        <div className="lg:col-span-5 bg-[#0D0F16]/40 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur">
          <h3 className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
            Target Device Specifications
          </h3>

          {/* Quick presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Target Templates</span>
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => handleQuickSpec("I need an optically active spin-qubit host with high Debye temperature (>1500K) to enable long coherence lifetimes above cryogenic temperatures.")}
                className="p-2.5 rounded bg-[#0A0B10] border border-slate-850/80 text-left text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer leading-normal"
              >
                "High Temperature Spin Qubit Host"
              </button>
              <button
                type="button"
                onClick={() => handleQuickSpec("An unconventional superconductor thin-film with a critical temperature Tc > 15 Kelvin, robust crystal structure, and low surface dielectric microwave loss.")}
                className="p-2.5 rounded bg-[#0A0B10] border border-slate-850/80 text-left text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer leading-normal"
              >
                "Low-Loss Superconducting Film"
              </button>
              <button
                type="button"
                onClick={() => handleQuickSpec("A semiconductor matrix containing no isotopes with nuclear spin, suitable for ion implantation of group-V donor qubits (e.g., Arsenic or Bismuth).")}
                className="p-2.5 rounded bg-[#0A0B10] border border-slate-850/80 text-left text-xs text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer leading-normal"
              >
                "Isotopically Pure Nuclear-Spin-Free Host"
              </button>
            </div>
          </div>

          <form onSubmit={handleDesignSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider block">
                Requirements Description
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe preferred operating temperature, wavelengths, substrate matching, bandgap constraints, spin state expectations..."
                value={specs}
                onChange={(e) => setSpecs(e.target.value)}
                className="w-full bg-[#0A0B10]/60 px-4 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50 text-slate-200 text-sm placeholder-slate-500 transition-all resize-none leading-relaxed focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>

            {/* High thinking model toggle */}
            <div className="p-4 bg-[#0A0B10]/60 border border-slate-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                  <BrainCircuit className="h-4 w-4 text-cyan-400" />
                  <span>Use Deep Reasoning</span>
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={thinkingMode}
                    onChange={(e) => setThinkingMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-500 peer-checked:after:bg-cyan-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500/20 border border-slate-700/60 transition-all"></div>
                </label>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Ensures proposals are physical, crystallographically plausible, and have reasonable thermodynamic stability profiles.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                isLoading
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] shadow-indigo-900/10"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Crystal Systems...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate Physical Prototyping proposals</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Prototyping suggestions output panel */}
        <div className="lg:col-span-7 bg-[#0D0F16]/20 border border-slate-800 rounded-2xl p-6 min-h-[460px] flex flex-col justify-between backdrop-blur">
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center space-y-4 text-center max-w-sm mx-auto py-16">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
              <div className="space-y-1">
                <h4 className="font-semibold text-slate-200 text-sm">Synthesizing Design Proposals</h4>
                <p className="text-xs text-slate-400 leading-normal font-mono">
                  Evaluating phase diagrams, crystal coordinate boundaries, and electron densities for target quantum specifications...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-grow flex flex-col items-center justify-center space-y-4 text-center max-w-sm mx-auto py-12 text-rose-400">
              <AlertCircle className="h-10 w-10 text-rose-400" />
              <div>
                <h4 className="font-semibold text-slate-200 text-sm font-mono uppercase tracking-wider">Design Cycle Interrupted</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  {error}
                </p>
              </div>
            </div>
          ) : designResult ? (
            <div className="flex-grow space-y-6 animate-fade-in">
              {/* Overall assessment card */}
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
                <h4 className="text-xs font-bold text-indigo-300 font-mono uppercase tracking-wider flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  <span>AI Insight Engine / Synthesis Assessment</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{designResult.overallAssessment}</p>
              </div>

              {/* Grid of proposals */}
              <div className="space-y-4">
                {designResult.compounds.map((proposal, idx) => {
                  const isImported = importedIndices.includes(idx);

                  return (
                    <div key={idx} className="p-5 bg-[#0A0B10] rounded-xl border border-slate-800/80 space-y-3.5 relative overflow-hidden group">
                      {/* Substrate tag */}
                      {proposal.substrateCompatibility && (
                        <div className="absolute top-0 right-0 bg-slate-900 border-l border-b border-slate-800 px-3 py-1 text-[9px] font-semibold text-slate-400 font-mono uppercase tracking-wider rounded-bl-lg">
                          Substrate: {proposal.substrateCompatibility}
                        </div>
                      )}

                      <div className="space-y-1 max-w-[85%]">
                        <span className="text-xl font-light text-cyan-400 font-serif italic">{proposal.formula}</span>
                        <p className="text-xs text-slate-400 font-medium">{proposal.crystalSystem} system</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-slate-900 py-3 text-[11px] text-slate-300">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 uppercase font-mono block">Physics Merit Justification</span>
                          <p className="leading-relaxed text-slate-400">{proposal.suitabilityJustification}</p>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono block">Primary Advantage</span>
                            <p className="text-slate-300 font-medium">{proposal.keyAdvantage}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase font-mono block">Fabrication Risk</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase inline-block ${
                              proposal.synthesisDifficulty === "Low"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : proposal.synthesisDifficulty === "Medium"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}>
                              {proposal.synthesisDifficulty} Difficulty
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleImportProposal(proposal, idx)}
                          disabled={isImported}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                            isImported
                              ? "bg-[#0D0F16] text-slate-500 border border-slate-850 cursor-default"
                              : "bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 active:scale-95 shadow-cyan-900/10"
                          }`}
                        >
                          {isImported ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Imported to Explorer</span>
                            </>
                          ) : (
                            <>
                              <Import className="h-3.5 w-3.5" />
                              <span>Import Compound to Explorer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center space-y-4 text-center max-w-sm mx-auto py-12 text-slate-400">
              <span className="p-3.5 rounded-full bg-[#0D0F16]/60 border border-slate-800">
                <Compass className="h-6 w-6 text-slate-600" />
              </span>
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">Design Blueprint Terminal Ready</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Enter your physical constraints, critical operating limits, and crystalline substrate matching specifications on the left to synthesize candidate crystals.
                </p>
              </div>
            </div>
          )}

          {/* Guidelines note */}
          <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-800/60 pt-4 mt-6">
            Proposals are synthesized dynamically utilizing solid-state physics theory, electron structure catalogs, and transport equations modeled via Gemini. High difficulty indicates complex phase diagrams or sensitive stoichiometry bounds.
          </div>
        </div>
      </div>
    </div>
  );
}
