import React, { useState, useEffect } from "react";
import { Material } from "./types";
import AICoPilot from "./components/AICoPilot";
import MaterialExplorer from "./components/MaterialExplorer";
import MaterialPredictor from "./components/MaterialPredictor";
import MaterialDesigner from "./components/MaterialDesigner";
import { Compass, BrainCircuit, Sparkles, Cpu, RefreshCw, Layers, Zap, Atom, MessageSquareText } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"copilot" | "explorer" | "predict" | "design">("copilot");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [computeUsage, setComputeUsage] = useState(74.2);
  const [mode, setMode] = useState<"spin" | "photonic">("spin");

  // Load custom materials from local storage and fetch predefined materials from express backend
  useEffect(() => {
    const loadMaterials = async () => {
      setIsLoading(true);
      try {
        const endpoint = mode === "photonic" ? "/api/photonic-materials" : "/api/predefined-materials";
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error("Failed to fetch materials.");
        }
        const predefined = await response.json();

        // Retrieve custom materials from localStorage
        const storageKey = mode === "photonic" ? "qumatforge_custom_photonic" : "qumatforge_custom_materials";
        const storedCustom = localStorage.getItem(storageKey);
        let customList: Material[] = [];
        if (storedCustom) {
          try {
            customList = JSON.parse(storedCustom);
          } catch (e) {
            console.error("Error parsing stored custom materials:", e);
          }
        }

        const combined = [...predefined, ...customList];
        setMaterials(combined);

        if (combined.length > 0) {
          setSelectedMaterial(combined[0]);
        } else {
          setSelectedMaterial(null);
        }
      } catch (err) {
        console.error("Error initializing materials data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMaterials();
  }, [mode]);

  // Handler to add a new custom material predicted/designed by Gemini
  const handleAddCustomMaterial = (newMat: Material) => {
    setMaterials((prev) => {
      const updated = [newMat, ...prev];

      const storageKey = mode === "photonic" ? "qumatforge_custom_photonic" : "qumatforge_custom_materials";
      const customOnly = updated.filter((m) => m.isCustom);
      localStorage.setItem(storageKey, JSON.stringify(customOnly));

      return updated;
    });

    // Select the newly created material and switch to explorer tab to view it
    setSelectedMaterial(newMat);
    setActiveTab("explorer");

    // Slightly increase compute power display for realistic effect
    setComputeUsage((prev) => +(prev + Math.random() * 5 + 2).toFixed(1));
  };

  return (
    <div className="min-h-screen bg-[#0A0B10] text-slate-300 flex flex-col md:flex-row font-sans selection:bg-cyan-500/20 selection:text-cyan-300 overflow-x-hidden">
      {/* Left Sidebar on Desktop / Top Navigation on Mobile */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0D0F16] flex flex-col shrink-0">

        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/60 flex items-center justify-between md:block">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-transform hover:rotate-12 duration-300">
              <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">QuMatForge</h1>
              <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase block font-semibold">AI Quantum Discovery</span>
            </div>
          </div>

          {/* Mobile indicator */}
          <div className="md:hidden flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400">Nominal</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-4 py-3 border-b border-slate-800/60">
          <div className="flex items-center justify-between bg-slate-900/60 rounded-xl p-1 border border-slate-800/80">
            <button
              onClick={() => setMode("spin")}
              className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === "spin"
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Atom className="h-3 w-3" />
              <span>Spin Qubit</span>
            </button>
            <button
              onClick={() => setMode("photonic")}
              className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                mode === "photonic"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Zap className="h-3 w-3" />
              <span>Photonic</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-4 py-6 space-y-2 flex flex-row md:flex-col justify-around md:justify-start overflow-x-auto md:overflow-x-visible">

          <button
            onClick={() => setActiveTab("copilot")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "copilot"
                ? "bg-cyan-500/10 text-white border border-cyan-500/30 shadow-md shadow-cyan-500/5"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            <MessageSquareText className={`h-4 w-4 ${activeTab === "copilot" ? "text-cyan-400" : "text-slate-400"}`} />
            <span>AI Scientist Co-Pilot</span>
          </button>

          <button
            onClick={() => setActiveTab("explorer")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "explorer"
                ? "bg-slate-800/60 text-white border border-slate-700/50 shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            <Compass className={`h-4 w-4 ${activeTab === "explorer" ? "text-cyan-400" : "text-slate-400"}`} />
            <span>Materials Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab("predict")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "predict"
                ? "bg-slate-800/60 text-white border border-slate-700/50 shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            <BrainCircuit className={`h-4 w-4 ${activeTab === "predict" ? "text-cyan-400" : "text-slate-400"}`} />
            <span>AI Compound Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab("design")}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeTab === "design"
                ? "bg-slate-800/60 text-white border border-slate-700/50 shadow-md"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
            }`}
          >
            <Sparkles className={`h-4 w-4 ${activeTab === "design" ? "text-cyan-400" : "text-slate-400"}`} />
            <span>AI Blueprint Designer</span>
          </button>

        </nav>

        {/* Compute Usage Widget - Desktop Only */}
        <div className="hidden md:block p-6 border-t border-slate-800/60">
          <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80">
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono font-bold">Compute Power</p>
              <Cpu className="h-3.5 w-3.5 text-cyan-500 animate-pulse" />
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(98, (computeUsage / 120) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2 text-[10px] text-slate-400 font-mono">
              <span>CGNN Solver</span>
              <span className="text-cyan-400 font-bold">{computeUsage} TFLOPS</span>
            </div>
          </div>
        </div>
      </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">

          {/* Top Header inside main view */}
          <header className="h-16 border-b border-slate-800/70 flex items-center justify-between px-6 sm:px-8 bg-[#0D0F16]/50 backdrop-blur">
            <div>
              <div className="hidden sm:flex items-center space-x-2 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                <span>Quantum Simulator Workspace</span>
                <span>/</span>
                <span className="text-cyan-400 font-bold">
                  {activeTab === "copilot" ? "AI Scientist Co-Pilot" : activeTab === "explorer" ? "Discovery Dashboard" : activeTab === "predict" ? "ML Prediction Queue" : "Crystalline Design proposals"}
                </span>
              </div>
              <h2 className="text-xs sm:hidden font-bold text-white uppercase tracking-wider">
                {activeTab === "copilot" ? "Co-Pilot" : activeTab === "explorer" ? "Discovery" : activeTab === "predict" ? "ML Prediction" : "AI Design"}
              </h2>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">System Status</p>
                <p className="text-xs text-emerald-400 font-mono font-semibold flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  <span>Nominal [Stable]</span>
                </p>
              </div>

              {/* User Avatar styled elegantly with gradients */}
              <div className="relative group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-600 via-teal-600 to-indigo-600 border border-slate-700 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-cyan-500/10 cursor-default">
                  AV
                </div>
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-xl invisible group-hover:visible transition-all opacity-0 group-hover:opacity-100 duration-150 z-50">
                  <p className="text-[9px] uppercase font-mono text-slate-500 font-bold">Operator</p>
                  <p className="text-xs text-white truncate font-medium">anandvageesha@gmail.com</p>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard Grid / Core Component Content */}
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {isLoading ? (
              <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="h-12 w-12 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin" />
                  <div className="h-6 w-6 bg-[#0A0B10] rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">Booting Quantum Materials Database...</p>
              </div>
            ) : (
              <div className="space-y-6 max-w-7xl mx-auto">
                {activeTab === "copilot" && (
                  <AICoPilot
                    mode={mode}
                    onAddCustomMaterial={handleAddCustomMaterial}
                  />
                )}
                {activeTab === "explorer" && (
                  <MaterialExplorer
                    materials={materials}
                    selectedMaterial={selectedMaterial}
                    onSelectMaterial={setSelectedMaterial}
                    onAddCustomMaterial={handleAddCustomMaterial}
                    mode={mode}
                  />
                )}
                {activeTab === "predict" && (
                  <MaterialPredictor
                    onAddCustomMaterial={handleAddCustomMaterial}
                    mode={mode}
                  />
                )}
                {activeTab === "design" && (
                  <MaterialDesigner
                    onAddCustomMaterial={handleAddCustomMaterial}
                    mode={mode}
                  />
                )}
              </div>
            )}
          </div>

          {/* Aesthetic footer */}
          <footer className="border-t border-slate-900/80 bg-[#0D0F16]/30 py-6 px-6 sm:px-8 mt-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-semibold text-slate-400">QuMatForge Quantum Materials Discovery Engine</p>
              <p className="text-[11px]">Predicting stable crystal lattices, defects, and superconductors for quantum computing systems.</p>
            </div>
            <div className="flex items-center space-x-6 text-[10px] font-mono tracking-wider">
              <span>Wide-Bandgap Hosts</span>
              <span>·</span>
              <span>BCS Superconductors</span>
              <span>·</span>
              <span>Majorana Bound States</span>
            </div>
          </footer>

        </main>
      </div>
    );
}