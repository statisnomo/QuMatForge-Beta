import React, { useState, useEffect } from "react";
import { Material } from "../types";
import { Sparkles, BrainCircuit, Loader2, Play, CheckCircle } from "lucide-react";

interface MaterialPredictorProps {
  onAddCustomMaterial: (material: Material) => void;
  mode: "spin" | "photonic";
}

export default function MaterialPredictor({ onAddCustomMaterial, mode }: MaterialPredictorProps) {
  const [formula, setFormula] = useState("");
  const [useCase, setUseCase] = useState(mode === "photonic" ? "Photonic / CV Quantum" : "Spin Qubit / Color Center");
  const [defects, setDefects] = useState("");
  const [thinkingMode, setThinkingMode] = useState(true);

  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<Material | null>(null);

  const loadingPhrases = [
    "Initializing Density Functional Theory (DFT) self-consistent crystal relaxation...",
    "Computing electronic band structures and projected densities of states (PDOS)...",
    "Mapping point defect transition energy levels within the host bandgap...",
    "Summing nuclear spin bath magnetic dipoles and isotopic natural abundances...",
    "Solving Raman spin-phonon interaction kinetics and Debye temperatures...",
    "Synthesizing final crystalline stability and quantum suitability metrics...",
  ];

  // Increment loading phase for realistic effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setLoadingPhase(0);
      interval = setInterval(() => {
        setLoadingPhase((prev) => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formula.trim()) {
      setError("Please specify a valid chemical formula.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPredictionResult(null);

    try {
      const response = await fetch("/api/predict-compound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formula: formula.trim(),
          useCase,
          defects: defects.trim() || "None",
          thinkingMode,
          mode,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Materials simulation failed.");
      }

      const predictedData = await response.json();
      
      // Inject unique id and mark as custom
      const formattedMaterial: Material = {
        ...predictedData,
        id: `custom-${Date.now()}`,
        isCustom: true,
      };

      setPredictionResult(formattedMaterial);
      onAddCustomMaterial(formattedMaterial);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "A network error occurred while running the ML prediction engine.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPreset = (presetFormula: string, presetUseCase: string, presetDopants: string) => {
    setFormula(presetFormula);
    setUseCase(presetUseCase);
    setDefects(presetDopants);
  };

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-[#0D0F16]/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">AI Compound Simulation Engine</h2>
            <p className="text-xs text-slate-400">Predict structural, thermodynamic, and spin coherence properties for novel quantum compounds</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form panel */}
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-[#0D0F16]/40 border border-slate-800 rounded-2xl p-6 space-y-5 backdrop-blur">
          <h3 className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider border-b border-slate-800 pb-2">
            Material Specifications
          </h3>

          {/* Preset buttons */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Candidate Presets</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickPreset("YVO4", "Qubit Host for Rare-Earths", "Er3+")}
                className="px-2.5 py-1 rounded bg-[#0A0B10] border border-slate-800 text-[10px] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                YVO4:Er3+
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("GaN", "Spin Qubit / Color Center", "Fe3+")}
                className="px-2.5 py-1 rounded bg-[#0A0B10] border border-slate-800 text-[10px] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                GaN:Fe3+
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("V5Si3", "Superconducting Qubit", "None")}
                className="px-2.5 py-1 rounded bg-[#0A0B10] border border-slate-800 text-[10px] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                V5Si3 (V-Si film)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset("WTe2", "Topological Qubit", "None")}
                className="px-2.5 py-1 rounded bg-[#0A0B10] border border-slate-800 text-[10px] text-slate-300 hover:text-cyan-400 hover:border-cyan-500/30 transition-all cursor-pointer"
              >
                WTe2 (Weyl semimetal)
              </button>
            </div>
          </div>

          {/* Chemical Formula Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider block">
              Chemical Formula / Alloy Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g., YVO4, GaAs, BaFe2As2"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="w-full bg-[#0A0B10]/60 px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50 text-slate-200 text-sm placeholder-slate-500 transition-all focus:ring-1 focus:ring-cyan-500/20"
            />
            <span className="text-[10px] text-slate-500 block">Use standard crystallographic chemical formula notation.</span>
          </div>

          {/* Quantum Use Case */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider block">
              Quantum Use Case Category
            </label>
            <select
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="w-full bg-[#0A0B10]/60 px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50 text-slate-200 text-sm transition-all focus:ring-1 focus:ring-cyan-500/20"
            >
              <option value="Spin Qubit / Color Center">Spin Qubit / Color Center</option>
              <option value="Superconducting Qubit">Superconducting Thin Film</option>
              <option value="Topological Qubit">Topological Qubit Host (Majorana)</option>
              <option value="Qubit Host / Donor Spin">Qubit Host / Donor Spin</option>
              <option value="Qubit Host for Rare-Earths">Qubit Host for Rare-Earth Ions</option>
            </select>
          </div>

          {/* Target Defects or Dopants */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider block">
              Defects / Dopant Species (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Er3+, substitutional Cr4+, Nitrogen-vacancy"
              value={defects}
              onChange={(e) => setDefects(e.target.value)}
              className="w-full bg-[#0A0B10]/60 px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50 text-slate-200 text-sm placeholder-slate-500 transition-all focus:ring-1 focus:ring-cyan-500/20"
            />
            <span className="text-[10px] text-slate-500 block">Specifies the qubit candidate point-defect, donor, or vacancy matrix element.</span>
          </div>

          {/* High thinking toggle */}
          <div className="p-4 bg-[#0A0B10]/60 border border-slate-800/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
                <BrainCircuit className="h-4 w-4 text-cyan-400" />
                <span>Enable High Thinking Mode</span>
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
              Utilizes the advanced Google Gemini reasoning engine with maximum reasoning capacity to synthesize exact solid-state physics values, crystalline metrics, and detailed chemical synthesis guides.
            </p>
          </div>

          {/* Run button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              isLoading
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-cyan-500 text-slate-950 hover:bg-cyan-400 active:scale-[0.98] glow-box-cyan"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Simulating Compound...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>Simulate Quantum Compound</span>
              </>
            )}
          </button>
        </form>

        {/* Prediction Display Result panel */}
        <div className="lg:col-span-7 bg-[#0D0F16]/20 border border-slate-800 rounded-2xl p-6 min-h-[460px] flex flex-col justify-between backdrop-blur">
          {isLoading ? (
            <div className="flex-grow flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto py-12">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
                <BrainCircuit className="h-5 w-5 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-2">
                <span className="text-[9px] font-bold font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase border border-indigo-500/20 tracking-wider">
                  Phase {loadingPhase + 1} / {loadingPhrases.length}
                </span>
                <h4 className="font-semibold text-slate-200 text-sm">Self-Consistent Simulation Active</h4>
                <p className="text-xs text-slate-400 leading-relaxed italic font-mono transition-all">
                  "{loadingPhrases[loadingPhase]}"
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-grow flex flex-col items-center justify-center space-y-4 text-center max-w-sm mx-auto py-12 text-rose-400">
              <span className="p-3 rounded-full bg-rose-500/10 border border-rose-500/20">
                <Loader2 className="h-6 w-6 text-rose-400 rotate-45" />
              </span>
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">Simulation Error</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  {error}
                </p>
              </div>
            </div>
          ) : predictionResult ? (
            <div className="flex-grow space-y-5 animate-fade-in">
              {/* Header result success */}
              <div className="flex items-center space-x-3 bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl">
                <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-cyan-300 font-mono uppercase tracking-wider">Prediction Complete!</h4>
                  <p className="text-[11px] text-slate-300 leading-normal">
                    AI predicted stable lattice arrangement and added <span className="font-mono font-bold text-slate-100">{predictionResult.formula}</span> to your Compound Explorer.
                  </p>
                </div>
              </div>

              {/* Quick specs card */}
              <div className="bg-[#0A0B10] p-5 rounded-xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <span className="text-2xl font-light text-white font-serif italic">{predictionResult.formula}</span>
                  <span className="text-[11px] text-cyan-400 font-mono font-bold bg-[#0D0F16] px-2.5 py-0.5 rounded border border-slate-800">
                    {predictionResult.suitabilityScore}% Suitability
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Crystal System</span>
                    <span className="text-slate-200 font-medium">{predictionResult.crystalSystem}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Space Group</span>
                    <span className="text-slate-200 font-medium font-mono">{predictionResult.spaceGroup}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Estimated T2</span>
                    <span className="text-cyan-400 font-bold font-mono">{predictionResult.coherenceT2Estimated}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Debye Temp</span>
                    <span className="text-slate-200 font-medium font-mono">{predictionResult.debyeTemperatureK} K</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Band Gap</span>
                    <span className="text-slate-200 font-medium font-mono">{predictionResult.bandGapEv.toFixed(2)} eV</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Formation Energy</span>
                    <span className={`font-semibold font-mono ${predictionResult.formationEnergyEvPerAtom < 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {predictionResult.formationEnergyEvPerAtom.toFixed(3)} eV
                    </span>
                  </div>
                </div>

                {/* Scientific Reason */}
                <div className="border-t border-slate-900 pt-3 text-xs space-y-1 leading-relaxed">
                  <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Scientific Reason Summary</span>
                  <p className="text-slate-400">{predictionResult.scientificReasoning}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center space-y-4 text-center max-w-sm mx-auto py-12 text-slate-400">
              <span className="p-3.5 rounded-full bg-[#0D0F16]/60 border border-slate-800">
                <Sparkles className="h-6 w-6 text-slate-600" />
              </span>
              <div>
                <h4 className="font-semibold text-slate-200 text-sm">Prediction Terminal Ready</h4>
                <p className="text-xs text-slate-500 mt-1 leading-normal">
                  Configure your compound's elemental formula and defects on the left panel, choose your ML engine resolution, and boot up the simulation solver.
                </p>
              </div>
            </div>
          )}

          {/* Quick Note */}
          <div className="text-[10px] text-slate-500 leading-normal border-t border-slate-800/60 pt-4 mt-6">
            Predictions utilize solid-state thermodynamic trends and defect-state modeling powered by Google Gemini. Materials should undergo physical MBE/CVD synthesis and XRD/ODMR characterization to confirm predicted quantum metrics.
          </div>
        </div>
      </div>
    </div>
  );
}
