import React, { useState } from "react";
import { Material } from "../types";
import { Search, Filter, CheckCircle2, AlertTriangle, Layers, BarChart4, Compass, Upload, Download } from "lucide-react";
import LatticeVisualizer from "./LatticeVisualizer";
import IsotopeSimulator from "./IsotopeSimulator";

interface MaterialExplorerProps {
  materials: Material[];
  selectedMaterial: Material | null;
  onSelectMaterial: (material: Material) => void;
  onAddCustomMaterial: (material: Material) => void;
  mode: "spin" | "photonic";
}

export default function MaterialExplorer({ materials, selectedMaterial, onSelectMaterial, onAddCustomMaterial, mode }: MaterialExplorerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [compareList, setCompareList] = useState<Material[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  // Import/Export state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [exportTrigger, setExportTrigger] = useState<number>(0); // trigger to re-create download link

  // Filter materials based on search & category
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      (m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.formula || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.crystalSystem || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "All" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Unique categories
  const categories = [
    "All",
    "Spin Qubit / Color Center",
    "Superconducting Qubit",
    "Topological Qubit",
    "Qubit Host / Donor Spin",
    "Qubit Host for Rare-Earths",
  ];

  const handleToggleCompare = (e: React.MouseEvent, material: Material) => {
    e.stopPropagation(); // prevent selecting the material
    setCompareList((prev) => {
      const exists = prev.find((m) => m.id === material.id);
      if (exists) {
        return prev.filter((m) => m.id !== material.id);
      } else {
        if (prev.length >= 3) {
          alert("You can compare up to 3 materials at a time.");
          return prev;
        }
        return [...prev, material];
      }
    });
  };

  const clearComparison = () => {
    setCompareList([]);
    setShowComparison(false);
  };

  const handleExportCustomMaterials = () => {
    const customMaterials = materials.filter((m) => m.isCustom);
    if (customMaterials.length === 0) {
      alert("No custom materials to export.");
      return;
    }
    const dataStr = JSON.stringify(customMaterials, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qumatforge-custom-materials-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Trigger re-render to animate download button
    setExportTrigger(prev => prev + 1);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        // Validate that data is an array
        if (!Array.isArray(data)) {
          throw new Error("Invalid file format: expected JSON array");
        }
        // Validate each item has minimum required fields
        const requiredFields = [
          "id",
          "name",
          "formula",
          "category",
          "crystalSystem",
          "spaceGroup",
          "bandGapEv",
          "formationEnergyEvPerAtom",
          "debyeTemperatureK",
          "suitabilityScore",
          "coherenceT2Estimated",
          "nuclearSpinBackgroundScore",
          "pros",
          "cons",
          "latticeParameters",
          "synthesisMethodRecommended",
          "scientificReasoning",
        ];
        const invalid = data.some((item: any) =>
          !requiredFields.every((field) => Object.prototype.hasOwnProperty.call(item, field))
        );
        if (invalid) {
          throw new Error("Some items are missing required material fields");
        }
        // Add each material
        let addedCount = 0;
        data.forEach((item: any) => {
          // Avoid duplicates by id
          const exists = materials.some((m) => m.id === item.id);
          if (!exists) {
            // Ensure isCustom flag is true for imported items
            const materialToAdd = { ...item, isCustom: true };
            onAddCustomMaterial(materialToAdd);
            addedCount++;
          }
        });
        if (addedCount > 0) {
          setImportMessage(`Successfully imported ${addedCount} custom material(s).`);
        } else {
          setImportMessage("No new materials to import (all already exist).");
        }
        setImportFile(null);
      } catch (err: any) {
        setImportMessage(`Import failed: ${err.message}`);
        setImportFile(null);
      }
    };
    reader.onerror = () => {
      setImportMessage("Failed to read file.");
      setImportFile(null);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Action bar (Search & Filter) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-4 border border-slate-800/80 rounded-2xl backdrop-blur">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search chemical formulas (e.g. YBa2Cu3O7)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0D0F16]/60 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-cyan-500/50 text-slate-200 text-sm placeholder-slate-500 transition-all focus:ring-1 focus:ring-cyan-500/30"
          />
          <span className="text-[10px] text-slate-500 block">Use standard crystallographic chemical formula notation.</span>
        </div>

        {/* Category filtering rails */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <Filter className="h-4 w-4 text-slate-500 flex-shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                categoryFilter === cat
                  ? "bg-slate-800/60 text-white border-slate-700/50 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/20"
              }`}
            >
              {cat === "All" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {/* Export / Import buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCustomMaterials}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              exportTrigger > 0 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-[#0D0F16]/50 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:bg-[#0D0F16]/80"
            }`}
          >
            <Download className={`h-4 w-4 ${exportTrigger > 0 ? "animate-pulse" : ""}`} />
            <span>Export Custom</span>
          </button>
          {/* Hidden file input */}
          <input
            type="file"
            accept=".json"
            id="import-file-input"
            hidden
            value={importFile?.name ?? ""}
            onChange={handleFileChange}
          />
          <button
            onClick={() => document.getElementById("import-file-input")?.click()}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              importFile ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-[#0D0F16]/50 text-slate-400 border border-slate-800/80 hover:text-slate-200 hover:bg-[#0D0F16]/80"
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Import Custom</span>
          </button>
          {importMessage && (
            <div className="ml-3 flex items-center space-x-2 text-xs rounded bg-[#0D0F16]/40 px-2.5 py-1 border border-slate-800/40">
              {importMessage.includes("Successfully") ? (
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              )}
            <span>{importMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Drawer Trigger */}
      {compareList.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-[#0D0F16] border border-slate-850 rounded-2xl shadow-xl animate-fade-in glow-box-cyan">
          <div className="flex items-center space-x-3">
            <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-semibold font-mono">
              Comparing {compareList.length} materials ({compareList.map((m) => m.formula).join(", ")})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-all glow-box-cyan`}
            >
              {showComparison ? "Hide Comparison Matrix" : "View Comparison Matrix"}
            </button>
            <button
              onClick={clearComparison}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 hover:text-slate-200 transition-all`}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Comparison Matrix Overlay */}
      {showComparison && compareList.length > 0 && (
        <div className="bg-[#0D0F16] border border-cyan-500/20 rounded-2xl p-6 shadow-2xl animate-fade-in space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-cyan-400 text-sm font-mono uppercase tracking-wider flex items-center space-x-2">
              <BarChart4 className="h-4 w-4" />
              <span>Quantum Performance Matrix</span>
            </h3>
            <button onClick={() => setShowComparison(false)} className="text-xs text-slate-400 hover:text-slate-200">
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 font-mono">
                  <th className="py-3 px-4">Metric / Parameter</th>
                  {compareList.map((m) => (
                    <th key={m.id} className="py-3 px-4 font-bold text-slate-100 font-sans text-sm">
                      {m.name} <span className="text-xs font-mono text-cyan-400">({m.formula})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Category</td>
                  {compareList.map((m) => (
                    <td key={m.id} className="py-3 px-4">{m.category}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Suitability Score</td>
                  {compareList.map((m) => (
                    <td key={m.id} className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-cyan-400">{m.suitabilityScore}/100</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="bg-cyan-400 h-full" style={{ width: `${m.suitabilityScore}%` }} />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Crystal Space Group</td>
                  {compareList.map((m) => (
                    <td key={m.id} className="py-3 px-4 font-mono">{m.crystalSystem} ({m.spaceGroup})</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Debye Temp. / Bandgap</td>
                  {compareList.map((m) => (
                    <td key={m.id} className="py-3 px-4 font-mono">
                      {m.debyeTemperatureK} K / {m.bandGapEv.toFixed(2)} eV
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Thermodynamic Stability</td>
                  {compareList.map((m) => (
                    <td key={m.id} className={`py-3 px-4 font-mono font-semibold ${m.formationEnergyEvPerAtom < 0 ? "text-emerald-400" : "text-amber-400"}`}>
                      {m.formationEnergyEvPerAtom.toFixed(3)} eV/atom
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Spin Coherence (T2)</td>
                  {compareList.map((m) => (
                    <td key={m.id} className="py-3 px-4 font-mono text-cyan-400">{m.coherenceT2Estimated}</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Nuclear Spin Quietness</td>
                  {compareList.map((m) => (
                    <td key={m.id} className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-purple-400">{m.nuclearSpinBackgroundScore}%</span>
                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="bg-purple-400 h-full" style={{ width: `${m.nuclearSpinBackgroundScore}%` }} />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-slate-400 font-mono">Recommended Synthesis</td>
                  {compareList.map((m) => (
                    <td key={m.id} className="py-3 px-4 text-slate-400">{m.synthesisMethodRecommended}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main split grid: Materials list vs Material details */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left column: Materials list */}
        <div className="xl:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
          <div className="text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Discovered Compounds ({filteredMaterials.length})</span>
            {filteredMaterials.length === 0 && <span className="text-amber-400 normal-case">No matches found</span>}
          </div>

          <div className="space-y-3">
            {filteredMaterials.map((mat) => {
              const isSelected = selectedMaterial?.id === mat.id;
              const isComparing = compareList.some((m) => m.id === mat.id);

              return (
                <div
                  key={mat.id}
                  onClick={() => onSelectMaterial(mat)}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-start ${
                    isSelected
                      ? "bg-[#0D0F16] border-cyan-500/40 shadow-lg shadow-cyan-500/5 glow-box-cyan"
                      : "bg-[#0D0F16]/40 border-slate-850 hover:border-slate-800 hover:bg-[#0D0F16]/80"
                  }`}
                >
                  {/* Custom predict tag */}
                  {mat.isCustom && (
                    <span className="absolute -top-2 -right-1.5 bg-cyan-500/10 text-cyan-400 text-[8px] font-bold font-mono px-1.5 py-0.5 rounded border border-cyan-500/20 shadow">
                      AI PREDICTED
                    </span>
                  )}

                  <div className="space-y-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-100 font-mono">{mat.formula}</span>
                      <span className="text-[10px] text-slate-400 font-medium">· {mat.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">{mat.category}</p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono pt-1">
                      <span>{mat.crystalSystem}</span>
                      <span>·</span>
                      <span>{mat.spaceGroup}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between h-full min-h-[50px]">
                    {/* Compare Checkbox */}
                    <button
                      onClick={(e) => handleToggleCompare(e, mat)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold border transition-all ${
                        isComparing
                          ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                          : "bg-[#0A0B10] text-slate-500 border-slate-800 group-hover:text-slate-300"
                      }`}
                    >
                      {isComparing ? "Comparing" : "+ Compare"}
                    </button>

                    <div className="text-right mt-2">
                      <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Suitability</span>
                      <span className="text-xs font-bold text-cyan-400 font-mono">{mat.suitabilityScore}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Selected Material details with lattice and simulation tabs */}
        <div className="xl:col-span-7 space-y-6">
          {selectedMaterial ? (
            <div className="space-y-6 animate-fade-in">
              {/* Material Overview card */}
              <div className="bg-[#0D0F16]/50 border border-slate-800/80 rounded-2xl p-6 backdrop-blur space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold font-mono tracking-wider text-cyan-400 uppercase bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                      {selectedMaterial.category}
                    </span>
                    <h2 className="text-2xl text-slate-100 flex items-center space-x-2 pt-1 font-serif font-light">
                      <span className="font-mono text-3xl italic">{selectedMaterial.formula}</span>
                      <span className="text-sm font-sans font-normal text-slate-400">({selectedMaterial.name})</span>
                    </h2>
                  </div>

                  {/* Suitability Score Gauge */}
                  <div className="flex items-center space-x-3 bg-[#0A0B10] p-3 rounded-xl border border-slate-800">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Suitability Score</span>
                      <span className="text-xs font-mono text-slate-400 font-semibold">Stability & Coherence</span>
                    </div>
                    <div className="relative flex items-center justify-center">
                      <span className="text-base font-bold font-mono text-cyan-400">{selectedMaterial.suitabilityScore}%</span>
                    </div>
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="p-3 bg-[#0A0B10]/40 rounded-xl border border-slate-800/40">
                    <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Bandgap</span>
                    <span className="text-sm font-bold text-slate-200 font-mono">
                      {selectedMaterial.bandGapEv === 0 ? "0.0 eV (Metallic)" : `${selectedMaterial.bandGapEv.toFixed(2)} eV`}
                    </span>
                  </div>
                  {mode === "photonic" ? (
                    <>
                      <div className="p-3 bg-[#0A0B10]/40 rounded-xl border border-slate-800/40">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Squeezing</span>
                        <span className="text-sm font-bold text-purple-400 font-mono">
                          {selectedMaterial.squeezingDb?.toFixed(3) || "N/A"} dB
                        </span>
                      </div>
                      <div className="p-3 bg-[#0A0B10]/40 rounded-xl border border-slate-800/40">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Refractive Index</span>
                        <span className="text-sm font-bold text-cyan-400 font-mono">
                          {selectedMaterial.refractiveIndex?.toFixed(3) || "N/A"}
                        </span>
                      </div>
                      <div className="p-3 bg-[#0A0B10]/40 rounded-xl border border-slate-800/40">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Piezo Modulus</span>
                        <span className="text-sm font-bold text-amber-400 font-mono">
                          {selectedMaterial.piezoelectricModulus?.toFixed(3) || "N/A"} C/m2
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-[#0A0B10]/40 rounded-xl border border-slate-800/40">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Debye Temp.</span>
                        <span className="text-sm font-bold text-slate-200 font-mono">{selectedMaterial.debyeTemperatureK} K</span>
                      </div>
                      <div className="p-3 bg-[#0A0B10]/40 rounded-xl border border-slate-800/40">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Spin Coherence (T2)</span>
                        <span className="text-sm font-bold text-cyan-400 font-mono truncate block" title={selectedMaterial.coherenceT2Estimated}>
                          {selectedMaterial.coherenceT2Estimated.split(",")[0]}
                        </span>
                      </div>
                      <div className="p-3 bg-[#0A0B10]/40 rounded-xl border border-slate-800/40">
                        <span className="text-[9px] text-slate-500 uppercase font-mono tracking-wider block">Nuclear Spin Bath</span>
                        <span className="text-sm font-bold text-purple-400 font-mono">{selectedMaterial.nuclearSpinBackgroundScore}% quiet</span>
                      </div>
                    </>
                  )}
                </div>

                  {/* Defect Characteristics Panel */}
                  {selectedMaterial.defectCharacteristics && (
                    <div className="bg-[#0A0B10]/50 rounded-xl p-4 border border-slate-800/80 space-y-2">
                      <div className="flex items-center space-x-2 border-b border-slate-900 pb-2">
                        <Layers className="h-4 w-4 text-cyan-400" />
                        <h4 className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                          Color Center / Point Defect Dynamics
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 block">Defect Name:</span>
                          <span className="text-xs font-semibold text-slate-200">{selectedMaterial.defectCharacteristics.defectName}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 block">Spin Ground State:</span>
                          <span className="text-xs font-mono text-slate-200 bg-[#0A0B10] px-2 py-0.5 rounded border border-slate-800">
                            {selectedMaterial.defectCharacteristics.spinState}
                          </span>
                        </div>
                        {selectedMaterial.defectCharacteristics.zeroPhononLineEv && (
                          <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 block">Zero-Phonon Line (ZPL):</span>
                            <span className="text-xs font-mono text-slate-200">
                              {selectedMaterial.defectCharacteristics.zeroPhononLineEv.toFixed(3)} eV ({selectedMaterial.defectCharacteristics.opticalTransitionWavelengthNm} nm)
                            </span>
                          </div>
                        )}
                        <div className="space-y-1 md:col-span-2">
                          <span className="text-[10px] text-slate-500 block">Optical Access / Readout:</span>
                          <p className="text-xs text-slate-400 leading-normal">{selectedMaterial.defectCharacteristics.opticalAccessibility}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pros & Cons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Key Advantages</span>
                      <ul className="space-y-1.5">
                        {selectedMaterial.pros.map((pro, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                            <CheckCircle2 className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                            <span>{pro}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Scientific Engineering Challenges</span>
                      <ul className="space-y-1.5">
                        {selectedMaterial.cons.map((con, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span>{con}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Synthesis Recommendations */}
                  <div className="border-t border-slate-800/60 pt-4 text-xs space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Recommended Fabrication/Synthesis</span>
                    <p className="text-slate-300 italic">{selectedMaterial.synthesisMethodRecommended}</p>
                  </div>

                  {/* Scientific Explanation */}
                  <div className="border-t border-slate-800/60 pt-4 text-xs space-y-2">
                    <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Materials Science Assessment & Physical Justification</span>
                    <p className="text-slate-400 leading-relaxed font-sans">{selectedMaterial.scientificReasoning}</p>
                  </div>
                </div>

                {/* Lattice 3D model */}
                <LatticeVisualizer material={selectedMaterial} />

                {/* Decoherence simulator */}
                <IsotopeSimulator material={selectedMaterial} />
              </div>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center bg-[#0D0F16]/20 border border-dashed border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <Compass className="h-10 w-10 text-slate-600 mb-4 animate-pulse" />
              <h3 className="font-semibold text-slate-200">No Compound Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Select a solid-state crystalline host or superconducting film from the discovered compounds list to analyze its lattice structure, spin physics, and thermal relaxations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}