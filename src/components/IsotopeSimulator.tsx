import React, { useState, useEffect, useRef } from "react";
import { Material } from "../types";
import { Thermometer, Sliders, ShieldAlert, Cpu, Zap, Activity } from "lucide-react";

interface IsotopeSimulatorProps {
  material: Material;
}

export default function IsotopeSimulator({ material }: IsotopeSimulatorProps) {
  // Let's check which nuclear spins are active
  const isDiamond = material.formula === "C (Diamond)";
  const isSi = material.formula.includes("Si") && !material.formula.includes("C") && !material.formula.includes("Y");
  const isSiC = material.formula.includes("SiC");
  const isYSO = material.formula.includes("Y2SiO5") || material.formula.includes("YSO");
  const isSuperconductor = material.category.includes("Superconducting");
  const isTopological = material.category.includes("Topological");

  // Determine active spin bath name
  let isotopeName = "Active Nuclear Spins";
  let naturalAbundance = 1.1; // %
  let minAbundance = 0.0001; // % (1 ppm)
  let initialAbundance = 1.1;

  if (isDiamond) {
    isotopeName = "13C Isotopic Fraction";
    naturalAbundance = 1.1;
  } else if (isSi) {
    isotopeName = "29Si Isotopic Fraction";
    naturalAbundance = 4.7;
    initialAbundance = 4.7;
  } else if (isSiC) {
    isotopeName = "29Si + 13C Bath Fraction";
    naturalAbundance = 2.9; // combined average
    initialAbundance = 2.9;
  } else if (isYSO) {
    isotopeName = "29Si + 89Y Bath Fraction";
    naturalAbundance = 15.0;
    initialAbundance = 15.0;
  } else {
    isotopeName = "Host Nuclear Spin Bath";
    naturalAbundance = 5.0;
    initialAbundance = 5.0;
  }

  // Sliders State
  const [spinAbundance, setSpinAbundance] = useState(initialAbundance);
  const [temperature, setTemperature] = useState(4.2); // Kelvin

  // Computed Values State
  const [computedT2, setComputedT2] = useState<number>(0.001); // in seconds
  const [computedT1, setComputedT1] = useState<number>(0.1); // in seconds
  const [limitingFactor, setLimitingFactor] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute physical coherence times based on sliders
  useEffect(() => {
    if (isSuperconductor) {
      // Superconductors are limited by Cooper pair breaking, temperature, and magnetic flux
      const Tc = material.debyeTemperatureK * 0.05 || 16; // mock critical temp
      const redTemp = temperature / Tc;

      let t2 = 0.00005; // 50 µs base
      if (redTemp >= 1.0) {
        t2 = 0.0; // superconductivity destroyed!
      } else {
        // scales inversely with quasiparticle density which goes as exp(-Delta/kT)
        const delta = 1.76 * 1.38e-23 * Tc;
        const quasiparticles = Math.exp(-1.5 / (redTemp + 0.01));
        t2 = 0.0001 / (1 + quasiparticles * 1000);
      }
      setComputedT2(t2);
      setComputedT1(t2 * 2);
      setLimitingFactor(temperature >= Tc ? "Superconductivity Destroyed" : "Quasiparticle Poisoning");
      return;
    }

    if (isTopological) {
      // Topological qubits are protected but have finite coherence from thermal bulk excitations
      const bulkGapK = material.bandGapEv * 11604; // convert eV to Kelvin
      const bulkExcitations = Math.exp(-bulkGapK / (2 * (temperature + 0.01)));

      let t2 = 1.0; // highly coherent surface
      if (temperature > 150) {
        t2 = 0.00001; // Bulk conduction completely shorts topological protection
      } else {
        t2 = 2.0 / (1 + bulkExcitations * 1e6);
      }
      setComputedT2(t2);
      setComputedT1(t2 * 1.5);
      setLimitingFactor(temperature > 150 ? "Bulk Conduction Short" : "Topological Phase Robustness");
      return;
    }

    // --- Spin defects / solid state spins ---
    // 1. Calculate T2 from nuclear spin bath dephasing
    // T2_nuclear is inversely proportional to concentration of nuclear spins
    const ratio = naturalAbundance / (spinAbundance + 1e-8);
    const naturalT2 = isDiamond ? 0.0018 : isSi ? 0.01 : isYSO ? 0.002 : 0.0005;
    const t2Nuclear = naturalT2 * ratio;

    // 2. Calculate T1 spin-lattice relaxation
    // Governed by Raman processes: 1/T1 proportional to T^7 or T^9 for non-Kramers/Kramers ions.
    // Also governed by Debye temperature (higher Debye means fewer phonons)
    const debye = material.debyeTemperatureK || 1000;
    const debyeScale = Math.pow(debye / 1000, 7);

    // Baseline relaxation rate at 4K
    const r1At4K = isDiamond ? 1e-4 : isSi ? 1e-1 : isYSO ? 0.5 : 1.0;
    const relaxationRate = r1At4K * Math.pow(temperature / 4.2, 7) / debyeScale;
    const t1 = 1 / (relaxationRate + 1e-6); // cap at ultra large

    // 3. Overall T2
    // Spin coherence is ultimately limited by spin-lattice relaxation: 1/T2 = 1/T2_nuclear + 1/(2*T1)
    const dephasingRate = (1 / t2Nuclear) + (1 / (2 * t1));
    const finalT2 = 1 / dephasingRate;

    setComputedT2(finalT2);
    setComputedT1(t1);

    // Determine what limits coherence
    if (1 / t2Nuclear > 1 / (2 * t1)) {
      setLimitingFactor("Isotopic Nuclear Spin Bath");
    } else {
      setLimitingFactor("Lattice Phonons (Thermal Relaxation)");
    }
  }, [spinAbundance, temperature, material, isDiamond, isSi, isSiC, isYSO, isSuperconductor, isTopological]);

  // Format coherence time for display
  const formatTime = (seconds: number) => {
    if (seconds === 0) return "0 s";
    if (seconds < 1e-6) return `${(seconds * 1e9).toFixed(1)} ns`;
    if (seconds < 0.001) return `${(seconds * 1e6).toFixed(1)} µs`;
    if (seconds < 1.0) return `${(seconds * 1e3).toFixed(1)} ms`;
    if (seconds < 3600) return `${seconds.toFixed(2)} s`;
    return `${(seconds / 3600).toFixed(1)} hours`;
  };

  // Draw the Quantum State Decoherence Curve on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;

    // Draw axes
    ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.font = "10px monospace";
    ctx.fillText("1.0", padding - 22, padding + 4);
    ctx.fillText("0.5", padding - 22, (height) / 2);
    ctx.fillText("0.0", padding - 22, height - padding);

    ctx.fillText("Coherence |ψ(t)⟩", padding - 25, padding - 15);
    ctx.fillText("Time (t)", width - padding - 40, height - padding + 15);

    if (computedT2 === 0) {
      // Draw flatline
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 11px Inter";
      ctx.fillText("COHERENCE DESTROYED", width / 2 - 70, height / 2);
      return;
    }

    // Decay shape: coherence = exp(-(t / T2)^2)
    // Map time from t = 0 to t = 3 * T2
    ctx.strokeStyle = "#10b981"; // Emerald
    ctx.lineWidth = 2.5;

    // Glowing line effect
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    const steps = 100;
    const maxTime = 3.0 * computedT2;

    for (let i = 0; i <= steps; i++) {
      const frac = i / steps;
      const t = frac * maxTime;
      const coherence = Math.exp(-Math.pow(t / computedT2, 2));

      // Coordinate mapping
      const x = padding + frac * (width - 2 * padding);
      const y = height - padding - coherence * (height - 2 * padding);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // clear shadow

    // Draw the T2 point vertical intercept
    const t2Frac = 1 / 3; // since maxTime is 3 * T2
    const t2X = padding + t2Frac * (width - 2 * padding);
    const t2Y = height - padding - Math.exp(-1) * (height - 2 * padding); // exp(-1) = 0.368

    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)"; // Orange dashed
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(t2X, height - padding);
    ctx.lineTo(t2X, t2Y);
    ctx.lineTo(padding, t2Y);
    ctx.stroke();
    ctx.setLineDash([]); // clear dash

    // Draw label for T2
    ctx.fillStyle = "#f59e0b";
    ctx.beginPath();
    ctx.arc(t2X, t2Y, 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.font = "10px monospace";
    ctx.fillText(`T2 = ${formatTime(computedT2)}`, t2X + 8, t2Y - 4);
    ctx.fillText("37% Coherent (1/e)", padding + 5, t2Y - 4);

  }, [computedT2, computedT1]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-xl flex flex-col space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">Dynamic Physics Simulator</h3>
            <p className="text-xs text-slate-400">Isotopic purification and phonon-lattice relaxation kinetics</p>
          </div>
        </div>
        <div className="text-[10px] font-semibold font-mono tracking-widest px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-400 uppercase">
          Sim Engine v1.4
        </div>
      </div>

      {/* Grid Layout: Sliders vs Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sliders Control Panel */}
        <div className="flex flex-col space-y-5 justify-center bg-slate-950/30 p-5 rounded-xl border border-slate-800/40">
          <h4 className="text-xs font-semibold text-slate-300 font-mono flex items-center space-x-2">
            <Sliders className="h-4 w-4 text-emerald-400" />
            <span>Environmental Parameters</span>
          </h4>

          {/* Isotopic bath slider - hide for pure superconductors/topological */}
          {!isSuperconductor && !isTopological ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">{isotopeName}</span>
                <span className="font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-0.5 rounded">
                  {spinAbundance < 0.01 ? `${(spinAbundance * 10000).toFixed(1)} ppm` : `${spinAbundance.toFixed(4)} %`}
                </span>
              </div>
              <input
                type="range"
                min="0.0001"
                max={naturalAbundance * 1.5}
                step="0.0001"
                value={spinAbundance}
                onChange={(e) => setSpinAbundance(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Ultra-Enriched (0.0001%)</span>
                <span>Natural ({naturalAbundance}%)</span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-400">
              <span className="text-slate-300 font-bold block mb-1">Crystalline Coherence protection</span>
              This compound uses topological symmetry protection or macroscopic phase coherence. Host nuclear spin baths do not dominate the dephasing mechanism.
            </div>
          )}

          {/* Operating temperature slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center space-x-1">
                <Thermometer className="h-3.5 w-3.5 text-rose-400" />
                <span>Cryogenic Temperature</span>
              </span>
              <span className="font-mono text-rose-400 font-bold bg-slate-950 px-2 py-0.5 rounded">
                {temperature < 1.0 ? `${(temperature * 1000).toFixed(0)} mK` : `${temperature.toFixed(2)} K`}
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="300"
              step={temperature < 2 ? "0.01" : "1.0"}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>Deep mK (0.01 K)</span>
              <span>4.2 K (Liquid Helium)</span>
              <span>300 K (Room Temp)</span>
            </div>
          </div>

          {/* Physical Warning if Temp is too high */}
          {temperature > 77 && !isDiamond && (
            <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Phonon Overload Warning:</span> At temperatures &gt; 77K, thermal lattice vibrations (phonons) break Cooper pairs or completely overwhelm spin lifetimes for most lattices except wide-bandgap hosts.
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Metrics Panel */}
        <div className="flex flex-col space-y-4 justify-between bg-slate-950 p-5 rounded-xl border border-slate-800">
          <div className="grid grid-cols-2 gap-4">
            {/* T2 Display */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Coherence (T2)</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 block mt-1">
                  {formatTime(computedT2)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 flex items-center space-x-1">
                <Cpu className="h-3 w-3 text-emerald-400" />
                <span>Superposition limit</span>
              </span>
            </div>

            {/* T1 Display */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider block">Relaxation (T1)</span>
                <span className="text-2xl font-bold font-mono text-teal-400 block mt-1">
                  {formatTime(computedT1)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-2 flex items-center space-x-1">
                <Zap className="h-3 w-3 text-teal-400" />
                <span>Lattice thermal limit</span>
              </span>
            </div>
          </div>

          {/* Physics feedback status */}
          <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Primary Decoherence Driver:</span>
            <span className="font-mono font-semibold px-2 py-1 rounded bg-slate-900 text-orange-400 border border-slate-800">
              {limitingFactor}
            </span>
          </div>
        </div>
      </div>

      {/* Live Decoherence Plot */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">
          Superposition State Decoherence Envelope
        </h4>
        <div className="bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex justify-center py-2">
          <canvas ref={canvasRef} width={500} height={200} className="w-full max-w-[500px]" />
        </div>
      </div>
    </div>
  );
}
