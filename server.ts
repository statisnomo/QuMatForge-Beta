import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Groq Client (free tier, fast)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ============================================================
// LOAD PHOTONIC CSV DATABASE
// ============================================================
interface PhotonicEntry {
  material_id: string;
  formula: string;
  band_gap: number;
  hull_eV: number;
  formation_eV: number;
  density: number;
  point_group: string;
  spacegroup: string;
  crystal_system: string;
  piezoelectric_modulus: number;
  refractive_index: number;
  photonic_score: number;
  sq_dB_pred: number;
  r_estimated: number;
  T_total: number;
  final_composite: number;
}

let photonicDB: PhotonicEntry[] = [];

try {
  const csvPath = path.join(process.cwd(), "photonic_final_candidates.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n");
  const headers = lines[0].split(",");

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",");
    const row: any = {};
    headers.forEach((h, idx) => { row[h.trim()] = vals[idx]?.trim() || ""; });
    photonicDB.push({
      material_id: row.material_id || "",
      formula: row.formula || "",
      band_gap: parseFloat(row.band_gap) || 0,
      hull_eV: parseFloat(row.hull_eV) || 0,
      formation_eV: parseFloat(row.formation_eV) || 0,
      density: parseFloat(row.density) || 0,
      point_group: row.point_group || "",
      spacegroup: row.spacegroup || "",
      crystal_system: row.crystal_system || "",
      piezoelectric_modulus: parseFloat(row.piezoelectric_modulus) || 0,
      refractive_index: parseFloat(row.refractive_index) || 0,
      photonic_score: parseFloat(row.photonic_score) || 0,
      sq_dB_pred: parseFloat(row.sq_dB_pred) || 0,
      r_estimated: parseFloat(row.r_estimated) || 0,
      T_total: parseFloat(row.T_total) || 0,
      final_composite: parseFloat(row.final_composite) || 0,
    });
  }
  console.log(`[QuMatForge] Loaded ${photonicDB.length} photonic materials from CSV`);
} catch (err) {
  console.warn("[QuMatForge] Could not load photonic CSV:", err);
}

// ============================================================
// PREDEFINED SPIN QUBIT MATERIALS (existing)
// ============================================================
const predefinedMaterials = [
  {
    id: "diamond-nv",
    name: "Diamond (NV- Center)",
    formula: "C (Diamond)",
    category: "Spin Qubit / Color Center",
    crystalSystem: "Cubic (Diamond)",
    spaceGroup: "Fd-3m",
    bandGapEv: 5.47,
    formationEnergyEvPerAtom: -1.86,
    debyeTemperatureK: 2230,
    suitabilityScore: 94,
    coherenceT2Estimated: "1.8 ms (natural C), > 1.0 s (99.99% 12C enriched)",
    defectCharacteristics: {
      defectName: "Nitrogen-Vacancy Center (NV-)",
      spinState: "S = 1",
      zeroPhononLineEv: 1.945,
      opticalTransitionWavelengthNm: 637,
      opticalAccessibility: "Excellent. Features spin-dependent photoluminescence for optical initialization and readout."
    },
    nuclearSpinBackgroundScore: 85,
    pros: [
      "Ultra-long spin coherence times even at room temperature",
      "Robust mechanical and thermal properties",
      "Highly accessible optical spin-readout (ODMR)"
    ],
    cons: [
      "Difficult to integrate with standard silicon microelectronics",
      "Strained lattice around defects can shift ZPL wavelengths",
      "Low photon collection efficiency without micro-fabricated solid immersion lenses"
    ],
    latticeParameters: { a: 3.567, b: 3.567, c: 3.567, alpha: 90, beta: 90, gamma: 90 },
    synthesisMethodRecommended: "Chemical Vapor Deposition (CVD) with delta-doped Nitrogen flow.",
    scientificReasoning: "Carbon diamond has an extremely wide bandgap and low spin-orbit coupling, which reduces spin-lattice relaxation. Enriching the diamond host with 12C (spin-0) eliminates the nuclear spin bath (13C), providing an incredibly quiet magnetic environment that pushes coherence times past one second."
  },
  {
    id: "sic-vs",
    name: "Silicon Carbide (VSi Center)",
    formula: "4H-SiC",
    category: "Spin Qubit / Color Center",
    crystalSystem: "Hexagonal (Wurtzite)",
    spaceGroup: "P6_3mc",
    bandGapEv: 3.23,
    formationEnergyEvPerAtom: -0.62,
    debyeTemperatureK: 1200,
    suitabilityScore: 89,
    coherenceT2Estimated: "120 us (natural SiC), > 50 ms (isotope enriched)",
    defectCharacteristics: {
      defectName: "Silicon vacancy (VSi)",
      spinState: "S = 3/2",
      zeroPhononLineEv: 1.40,
      opticalTransitionWavelengthNm: 885,
      opticalAccessibility: "Very good. Emits in the near-infrared, closer to the telecom band compared to diamond."
    },
    nuclearSpinBackgroundScore: 78,
    pros: [
      "Mature industrial fabrication technology (wafers up to 200mm available)",
      "Excellent semiconductor properties for electrical control and integration",
      "Favorable near-infrared emission matching telecom fiber transmission window"
    ],
    cons: [
      "High nuclear spin density of natural Si (4.7% 29Si) and C (1.1% 13C)",
      "Higher mechanical strain and crystal defect density than high-purity CVD diamond"
    ],
    latticeParameters: { a: 3.073, b: 3.073, c: 10.05, alpha: 90, beta: 90, gamma: 120 },
    synthesisMethodRecommended: "Sublimation (Physical Vapor Transport) or CVD epitaxy for defect creation.",
    scientificReasoning: "Silicon Carbide is an outstanding platform for quantum photonics due to its industrial maturity. By using isotopic purification of both 28Si and 12C, spin coherence times of the silicon vacancy can be improved by orders of magnitude. The S=3/2 ground state offers unique spin-mechanical coupling dynamics."
  },
  {
    id: "si-donor",
    name: "Silicon (Phosphorus Donor)",
    formula: "28Si:P",
    category: "Qubit Host / Donor Spin",
    crystalSystem: "Cubic (Diamond)",
    spaceGroup: "Fd-3m",
    bandGapEv: 1.12,
    formationEnergyEvPerAtom: -4.63,
    debyeTemperatureK: 645,
    suitabilityScore: 96,
    coherenceT2Estimated: "10 ms (natural Si), > 3 hours (nuclear spin in 28Si at 50 mK)",
    defectCharacteristics: {
      defectName: "Phosphorus-31 substitutional donor",
      spinState: "S = 1/2, I = 1/2",
      zeroPhononLineEv: 1.15,
      opticalTransitionWavelengthNm: 1078,
      opticalAccessibility: "Moderate. Requires cryogenic optical techniques or RF/microwave transport detection."
    },
    nuclearSpinBackgroundScore: 99,
    pros: [
      "Ultimate compatibility with global CMOS manufacturing facilities",
      "'Semiconductor vacuum' - isotopic 28Si has zero nuclear spin, eliminating dephasing",
      "Phosphorus nuclear spin can act as a long-lived quantum memory register"
    ],
    cons: [
      "Requires ultra-low cryogenic temperatures (< 100 mK) for electron spin stability",
      "Small electron wave-function requires precise nanoscale gate placement (< 20 nm)"
    ],
    latticeParameters: { a: 5.431, b: 5.431, c: 5.431, alpha: 90, beta: 90, gamma: 90 },
    synthesisMethodRecommended: "Ultra-high vacuum CVD with isotopically pure Silane (28SiH4), followed by ion implantation.",
    scientificReasoning: "Isotopically enriched 28Si is known as a 'semiconductor vacuum' because it is completely devoid of magnetic noise. When doped with Phosphorus-31, the combination of a S=1/2 electron spin and an I=1/2 nuclear spin creates a highly stable, controllable two-qubit system with coherence times unmatched in the solid state."
  },
  {
    id: "yso-er",
    name: "Yttrium Orthosilicate (Erbium)",
    formula: "Y2SiO5:Er",
    category: "Qubit Host for Rare-Earths",
    crystalSystem: "Monoclinic",
    spaceGroup: "C2/c",
    bandGapEv: 6.0,
    formationEnergyEvPerAtom: -3.85,
    debyeTemperatureK: 580,
    suitabilityScore: 92,
    coherenceT2Estimated: "2 ms (electron spin), > 1.3 hours (nuclear spin at cryogenic temps)",
    defectCharacteristics: {
      defectName: "Erbium (Er3+) substitutional dopant",
      spinState: "S = 1/2",
      zeroPhononLineEv: 0.805,
      opticalTransitionWavelengthNm: 1540,
      opticalAccessibility: "Perfect. Operates directly in the standard telecom C-band (1.54 um) for fiber optic networks."
    },
    nuclearSpinBackgroundScore: 82,
    pros: [
      "True telecom-native transition, essential for long-distance quantum repeaters",
      "Very low inhomogeneous spectral broadening",
      "Extremely long nuclear coherence times for quantum storage"
    ],
    cons: [
      "Weak optical dipole transitions require high-Q cavities for single-photon emission",
      "Complex monoclinic crystal structure makes fabrication and micro-structuring difficult"
    ],
    latticeParameters: { a: 10.41, b: 10.24, c: 12.49, alpha: 90, beta: 102.6, gamma: 90 },
    synthesisMethodRecommended: "Czochralski crystal pulling from high-purity oxide powders.",
    scientificReasoning: "Rare-earth ions like Erbium embedded in low-magnetic-moment host crystals like YSO possess incredibly stable inner-shell 4f-4f transitions. YSO is chosen because Yttrium, Silicon, and Oxygen have isotopes with very small or zero nuclear magnetic moments, creating an exceptionally stable lattice environment for quantum communication repeaters."
  },
  {
    id: "nbn-sc",
    name: "Niobium Nitride (NbN)",
    formula: "NbN",
    category: "Superconducting Qubit",
    crystalSystem: "Cubic (Rock Salt)",
    spaceGroup: "Fm-3m",
    bandGapEv: 0,
    formationEnergyEvPerAtom: -0.95,
    debyeTemperatureK: 310,
    suitabilityScore: 88,
    coherenceT2Estimated: "10 us to 100 us (depending on junction configuration)",
    defectCharacteristics: {
      defectName: "Superconducting Cooper pairs / Josephson Junctions",
      spinState: "N/A",
      zeroPhononLineEv: 0,
      opticalTransitionWavelengthNm: 0,
      opticalAccessibility: "N/A. Readout is conducted entirely via microwave cavities and RF reflectometry."
    },
    nuclearSpinBackgroundScore: 50,
    pros: [
      "High superconducting transition temperature (Tc ~ 16 K) compared to Aluminum (1.2 K)",
      "High kinetic inductance, allowing ultra-high impedance qubits that suppress charge noise",
      "Outstanding resistance to magnetic fields"
    ],
    cons: [
      "High dielectric loss in oxide layers can limit coherence times",
      "Requires thin-film optimization to prevent crystalline grain boundaries"
    ],
    latticeParameters: { a: 4.39, b: 4.39, c: 4.39, alpha: 90, beta: 90, gamma: 90 },
    synthesisMethodRecommended: "Reactive Magnetron Sputtering of Niobium in Nitrogen atmosphere.",
    scientificReasoning: "NbN is a disordered BCS superconductor with a high Tc and strong kinetic inductance. For superconducting qubits, replacing conventional Aluminum with NbN can significantly increase operating temperatures or enable high-impedance fluxonium/flux-biased systems that are protected against charge noise and external magnetic perturbations."
  },
  {
    id: "bi2se3-ti",
    name: "Bismuth Selenide (Bi2Se3)",
    formula: "Bi2Se3",
    category: "Topological Qubit Host",
    crystalSystem: "Trigonal",
    spaceGroup: "R-3m",
    bandGapEv: 0.3,
    formationEnergyEvPerAtom: -0.42,
    debyeTemperatureK: 182,
    suitabilityScore: 85,
    coherenceT2Estimated: "Topology protected (theoretically infinite against local perturbations)",
    defectCharacteristics: {
      defectName: "Surface helical Dirac fermions / Majorana states",
      spinState: "Spin-momentum locked",
      zeroPhononLineEv: 0,
      opticalTransitionWavelengthNm: 0,
      opticalAccessibility: "Indirect. Readout using topological transport measurements or scanning tunneling microscopy."
    },
    nuclearSpinBackgroundScore: 40,
    pros: [
      "Strong spin-orbit coupling leads to highly robust, topologically protected surface states",
      "Serves as the host for Majorana zero modes when interfaced with an s-wave superconductor",
      "Bulk is an insulator, restricting electronic conduction to helical surface state channels"
    ],
    cons: [
      "Inherent selenium vacancies often self-dope the bulk into a metal, requiring compensation",
      "Extremely sensitive to interface quality with superconductors"
    ],
    latticeParameters: { a: 4.14, b: 4.14, c: 28.64, alpha: 90, beta: 90, gamma: 120 },
    synthesisMethodRecommended: "Molecular Beam Epitaxy (MBE) on Sapphire or GaAs substrates.",
    scientificReasoning: "Bi2Se3 is a quintessential 3D topological insulator. Because of its spin-momentum locked helical surface states, proximity-coupling Bi2Se3 to a superconductor induces an unconventional superconducting state that can host Majorana bound states. These states form topological qubits, which are immune to local decoherence because quantum information is stored non-locally."
  }
];

// ============================================================
// CONVERT PHOTONIC DB ENTRIES TO MATERIAL FORMAT
// ============================================================
function photonicToMaterial(entry: PhotonicEntry, index: number): any {
  return {
    id: `photonic-${entry.material_id}`,
    name: entry.formula,
    formula: entry.formula,
    category: "Photonic / CV Quantum",
    crystalSystem: entry.crystal_system || "Unknown",
    spaceGroup: entry.spacegroup || "Unknown",
    bandGapEv: entry.band_gap,
    formationEnergyEvPerAtom: entry.formation_eV,
    debyeTemperatureK: 0,
    suitabilityScore: Math.round((entry.final_composite / 0.7) * 100),
    coherenceT2Estimated: `${entry.sq_dB_pred.toFixed(3)} dB squeezing`,
    nuclearSpinBackgroundScore: entry.photonic_score * 9,
    pros: [
      `Predicted squeezing: ${entry.sq_dB_pred.toFixed(3)} dB`,
      `Refractive index: ${entry.refractive_index.toFixed(3)}`,
      entry.hull_eV === 0 ? "Thermodynamically stable (hull = 0)" : `Near hull: ${entry.hull_eV.toFixed(4)} eV`,
    ],
    cons: [
      entry.piezoelectric_modulus < 1 ? "Low piezoelectric modulus" : "",
      entry.T_total < 0.55 ? "Moderate optical loss budget" : "",
    ].filter(Boolean),
    synthesisMethodRecommended: "See Materials Project for synthesis details",
    scientificReasoning: `Noncentrosymmetric ${entry.crystal_system} crystal (${entry.spacegroup}) with band gap ${entry.band_gap.toFixed(2)} eV. Piezoelectric modulus ${entry.piezoelectric_modulus.toFixed(3)} C/m2 and refractive index ${entry.refractive_index.toFixed(3)} yield estimated squeezing parameter r = ${entry.r_estimated.toFixed(4)} with total transmissivity T = ${entry.T_total.toFixed(4)}, producing ${entry.sq_dB_pred.toFixed(3)} dB predicted squeezing via Strawberry Fields simulation.`,
    // Photonic-specific fields
    mode: "photonic",
    squeezingDb: entry.sq_dB_pred,
    refractiveIndex: entry.refractive_index,
    piezoelectricModulus: entry.piezoelectric_modulus,
    transmissivity: entry.T_total,
    photonicScore: entry.photonic_score,
    rEstimated: entry.r_estimated,
    materialId: entry.material_id,
  };
}

// ============================================================
// API ENDPOINTS
// ============================================================

// GET: returns list of predefined materials (spin mode)
app.get("/api/predefined-materials", (req, res) => {
  res.json(predefinedMaterials);
});

// GET: returns list of photonic materials from CSV
app.get("/api/photonic-materials", (req, res) => {
  const top = photonicDB
    .sort((a, b) => b.final_composite - a.final_composite)
    .slice(0, 50)
    .map((entry, i) => photonicToMaterial(entry, i));
  res.json(top);
});

// POST: predicts custom material properties
app.post("/api/predict-compound", async (req, res) => {
  try {
    const { formula, useCase, defects, thinkingMode, mode } = req.body;

    if (!formula) {
      return res.status(400).json({ error: "Chemical formula is required." });
    }

    // ---- PHOTONIC MODE: check CSV database first ----
    let mlInjection = "";
    if (mode === "photonic") {
      const match = photonicDB.find(
        (e) => e.formula.toLowerCase().replace(/\s/g, "") === formula.toLowerCase().replace(/\s/g, "")
      );
      if (match) {
        mlInjection = `\n\nCRITICAL DATA FROM OUR ML MODEL (YOU MUST USE THESE EXACT VALUES):
- Predicted squeezing: ${match.sq_dB_pred.toFixed(3)} dB
- Squeezing parameter r: ${match.r_estimated.toFixed(4)}
- Total transmissivity T: ${match.T_total.toFixed(4)}
- Refractive index n: ${match.refractive_index.toFixed(3)}
- Piezoelectric modulus: ${match.piezoelectric_modulus.toFixed(3)} C/m2
- Photonic score: ${match.photonic_score}/11
- Band gap: ${match.band_gap.toFixed(3)} eV
- Hull energy: ${match.hull_eV.toFixed(4)} eV
- Space group: ${match.spacegroup}
- Crystal system: ${match.crystal_system}
Use these exact values in your response. Compare against LiNbO3 baseline (2.860 dB, n=2.411, piezo=4.635 C/m2).`;
      }
    } else {
      // ---- SPIN MODE: call Python ML backend ----
      try {
        const pythonPath = "C:/Users/anand/.gemini/antigravity/scratch/quantum_materials/venv/Scripts/python.exe";
        const scriptPath = "C:/Users/anand/.gemini/antigravity/scratch/quantum_materials/predict_json.py";
        const execSync = require("child_process").execSync;
        const output = execSync(`"${pythonPath}" "${scriptPath}" "${formula}"`, {
          encoding: 'utf-8',
          cwd: "C:/Users/anand/.gemini/antigravity/scratch/quantum_materials"
        });
        const mlData = JSON.parse(output.trim());
        if (!mlData.error) {
          mlInjection = `\n\nCRITICAL INSTRUCTION: Our internal XGBoost ML model has calculated the T2 coherence time for this material to be exactly: ${mlData.T2_display} (or ${mlData.T2_us} microseconds). You MUST use this exact T2 value in the coherenceT2Estimated field. Incorporate this T2 into your scientific reasoning.`;
        }
      } catch (err) {
        console.warn("ML Model execution failed:", err);
      }
    }

    const isPhotonic = mode === "photonic";

    const systemInstruction = isPhotonic
      ? `You are an expert in photonic quantum computing and continuous-variable (CV) quantum hardware.
Analyze the material for its suitability as a photonic squeezing platform. Focus on chi(2) nonlinearity, refractive index, waveguide compatibility, loss budgets, and predicted squeezing in dB.
Compare all results against the LiNbO3 baseline (2.860 dB squeezing, n=2.411, piezo=4.635 C/m2).
Your response MUST be a single, valid JSON object matching the required schema. No markdown, no backticks.`
      : `You are an elite Quantum Materials Scientist and Solid-State Physicist.
Analyze the chemical formula, host lattice, use case, and defects for quantum computing applications.
Provide realistic, scientifically sound solid-state values based on physical trends, DFT literature, and experimental data.
Your response MUST be a single, valid JSON object that exactly satisfies the required schema. No conversational filler, no markdown formatting outside the JSON, no backticks outside the JSON.`;

    const userPrompt = isPhotonic
      ? `Predict the photonic quantum properties for: ${formula}
Target application: CV photonic squeezing platform
${mlInjection}

Generate a comprehensive analysis including crystal structure, optical properties, predicted squeezing performance, waveguide compatibility, and comparison to LiNbO3. Include pros/cons and synthesis recommendations.`
      : `Predict the quantum properties for the material with the following details:
Formula: ${formula}
Use Case/Category: ${useCase || "Spin Qubit / Color Center"}
Defects/Dopants: ${defects || "None / Host material analysis"}${mlInjection}

Generate a detailed, comprehensive prediction of this material's thermodynamic, structural, and qubit properties. Include realistic lattice parameters, estimated coherence times (considering isotopic enrichment options), the exact defect characteristics (if applicable), pros/cons, synthesis methods, and a thorough scientific explanation in the 'scientificReasoning' field.`;

    // Call Groq instead of Gemini
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemInstruction + "\n\nYou MUST respond with a valid JSON object containing these fields: formula (string), crystalSystem (string), spaceGroup (string), bandGapEv (number), formationEnergyEvPerAtom (number), debyeTemperatureK (number), suitabilityScore (number 0-100), primaryQubitType (string), coherenceT2Estimated (string), nuclearSpinBackgroundScore (number 0-100), pros (array of strings), cons (array of strings), latticeParameters (object with a,b,c,alpha,beta,gamma numbers), synthesisMethodRecommended (string), scientificReasoning (string)" + (isPhotonic ? ", squeezingDb (number), refractiveIndex (number), piezoelectricModulus (number), transmissivity (number), photonicScore (number), rEstimated (number)" : "") },
        { role: "user", content: userPrompt }
      ]
    });

    const textContent = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(textContent.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Prediction Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during material prediction." });
  }
});

// POST: designs new materials based on custom requirements/specs
app.post("/api/design-material", async (req, res) => {
  try {
    const { targetSpecs, thinkingMode, mode } = req.body;

    if (!targetSpecs) {
      return res.status(400).json({ error: "Target quantum specifications are required." });
    }

    const isPhotonic = mode === "photonic";

    const systemInstruction = isPhotonic
      ? `You are a Nobel-prize-caliber Photonic Materials Design AI.
The user provides photonic quantum specs (squeezing targets, wavelength ranges, loss budgets, material classes).
You must suggest 3 highly plausible noncentrosymmetric compounds with strong chi(2) nonlinearity.
Compare all suggestions against LiNbO3 baseline (2.860 dB squeezing, n=2.411, piezo=4.635 C/m2).
Output must be structured JSON matching the required schema.`
      : `You are a Nobel-prize-caliber Materials Design AI.
The user provides quantum specs (e.g., specific operating temperatures, coherence constraints, wavelengths, or material classes).
You must invent or suggest a list of 3 highly plausible stable compounds or alloy systems. Use actual physics principles to justify them.
Your output must be structured exactly matching the provided JSON response schema. No markdown formatting, no extra commentary outside the JSON.`;

    const userPrompt = `Design and propose exactly 3 compounds that fit the following ${isPhotonic ? 'photonic quantum' : 'quantum'} specifications:
"${targetSpecs}"

Provide for each suggested material:
- Chemical Formula
- Crystal System
- Estimated Critical Temp (or Debye Temp)
- Deep suitability justification from physical principles
- Key mechanical or electronic advantage
- Synthesis difficulty and substrate compatibility`;

    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemInstruction + "\n\nYou MUST respond with a valid JSON object containing: compounds (array of objects, each with formula, crystalSystem, estimatedTcK, suitabilityJustification, keyAdvantage, synthesisDifficulty, substrateCompatibility), overallAssessment (string)" },
        { role: "user", content: userPrompt }
      ]
    });

    const textContent = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(textContent.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Design Error:", error);
    res.status(500).json({ error: error.message || "An error occurred during materials design." });
  }
});

// ============================================================
// COUNCIL OF AGENTS - MULTI-MODEL DEBATE ENDPOINT
// ============================================================
app.post("/api/council-debate", async (req, res) => {
  try {
    const { formula, input_data } = req.body;
    
    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Run Python ML models concurrently via predict.py
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);
    
    // Paths to virtual env and script
    const isWindows = process.platform === "win32";
    const pythonPath = isWindows 
      ? path.join(process.cwd(), "venv/Scripts/python.exe")
      : path.join(process.cwd(), "venv/bin/python");
    const scriptPath = path.join(process.cwd(), "predict.py");
    
    // Fallback default predictions if ML fails
    let mlPredictions = { RandomForest: 1.2, GradientBoosting: 1.4, XGBoost: 1.0 };
    
    try {
      const escapedInput = JSON.stringify(input_data).replace(/"/g, '\\"');
      const { stdout } = await execAsync(`"${pythonPath}" "${scriptPath}" "${escapedInput}"`, { cwd: process.cwd() });
      const parsed = JSON.parse(stdout.trim());
      if (parsed.status === "success") {
        mlPredictions = parsed.predictions;
      } else {
        console.warn("Python prediction error:", parsed.message);
      }
    } catch (e: any) {
      console.warn("Failed to execute ML models locally. Using standard fallbacks.", e.message);
    }

    // Stream the initial ML predictions to the frontend immediately
    res.write(`data: ${JSON.stringify({ type: 'models', data: mlPredictions })}\n\n`);

    const systemPrompt = `You are the QuMatForge 'Council of Agents', an elite panel of Quantum Material AI personas evaluating a compound for photonic squeezing.
There are 3 ML models that just ran on the input data and gave slightly different predictions for the 'Squeezing dB' (higher is better).

Your job is to simulate a fierce, structured debate among 4 personas. 
Format your output exactly using the following tags for each speaker. Do NOT wrap the tags in markdown code blocks.

<agent_rf> (Representing the Random Forest model's prediction. Pragmatic, looks at decision trees.)
<agent_gb> (Representing the Gradient Boosting model. Aggressive, looks at error gradients.)
<agent_xgb> (Representing XGBoost. Elite, highly optimized, confident.)
<judge> (The Council Leader. Summarizes the debate and declares the final predicted score.)

Make the debate dramatic but scientifically rigorous based on the provided material formula and the ML scores. The Judge MUST state the final absolute prediction at the end.`;

    const userPrompt = `Material Formula: ${formula}
Input Features: ${JSON.stringify(input_data)}

ML Model Predictions (Squeezing dB):
- Random Forest: ${mlPredictions.RandomForest.toFixed(3)} dB
- Gradient Boosting: ${mlPredictions.GradientBoosting.toFixed(3)} dB
- XGBoost: ${mlPredictions.XGBoost.toFixed(3)} dB

Commence the debate.`;
    
    // Stream Groq response
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt }, 
        { role: "user", content: userPrompt }
      ],
      stream: true,
      max_tokens: 2500
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'token', content })}\n\n`);
      }
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Council Debate Error:", err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
});

// ============================================================
// AI SCIENTIST CO-PILOT - STREAMING CHAT ENDPOINT
// ============================================================
app.post("/api/copilot-chat", async (req, res) => {
  try {
    const { message, mode, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Build context about the database so the AI can reference real materials
    let dbContext = "";
    if (mode === "photonic") {
      const topMaterials = photonicDB
        .sort((a, b) => b.final_composite - a.final_composite)
        .slice(0, 15)
        .map(m => `${m.formula} (sq=${m.sq_dB_pred.toFixed(2)}dB, n=${m.refractive_index.toFixed(2)}, piezo=${m.piezoelectric_modulus.toFixed(2)}, gap=${m.band_gap.toFixed(2)}eV, hull=${m.hull_eV.toFixed(3)}eV, ${m.crystal_system} ${m.spacegroup})`)
        .join("\n");
      dbContext = `\n\nYou have access to our photonic materials database. Here are the top 15 candidates by composite score:\n${topMaterials}`;
    } else {
      dbContext = `\n\nYou have access to our spin qubit materials database containing: Diamond NV- centers, Silicon Carbide (4H-SiC) VSi, hBN VB-, Silicon:P donors, CaWO4:Er3+ rare-earth hosts, Y2SiO5:Er3+ telecom hosts, NbN superconducting films, Bi2Se3 topological insulators, and others.`;
    }

    // Check if the user's message refers to a specific formula in the photonic DB
    let materialLookup = "";
    if (mode === "photonic") {
      const formulaMatch = photonicDB.find(
        (e) => message.toLowerCase().includes(e.formula.toLowerCase())
      );
      if (formulaMatch) {
        materialLookup = `\n\nEXACT DB MATCH for "${formulaMatch.formula}":\n- Material ID: ${formulaMatch.material_id}\n- Band gap: ${formulaMatch.band_gap.toFixed(3)} eV\n- Hull energy: ${formulaMatch.hull_eV.toFixed(4)} eV\n- Formation energy: ${formulaMatch.formation_eV.toFixed(4)} eV/atom\n- Density: ${formulaMatch.density.toFixed(2)} g/cm³\n- Piezoelectric modulus: ${formulaMatch.piezoelectric_modulus.toFixed(3)} C/m²\n- Refractive index: ${formulaMatch.refractive_index.toFixed(3)}\n- Crystal system: ${formulaMatch.crystal_system}, Space group: ${formulaMatch.spacegroup}\n- Photonic score: ${formulaMatch.photonic_score}/11\n- Predicted squeezing: ${formulaMatch.sq_dB_pred.toFixed(3)} dB\n- Squeezing parameter r: ${formulaMatch.r_estimated.toFixed(4)}\n- Total transmissivity T: ${formulaMatch.T_total.toFixed(4)}\n- Final composite: ${formulaMatch.final_composite.toFixed(4)}\nUse these EXACT values in your analysis.`;
      }
    }

    const systemPrompt = `You are the **QuMat AI Lead Scientist**, the co-pilot for the QuMatForge quantum materials discovery platform. You are an expert in condensed matter physics, quantum computing materials, crystallography, DFT simulations, and materials science.

Your capabilities:
- Analyze quantum materials for spin qubit, photonic, superconducting, and topological qubit applications
- Explain crystal structures, defect physics, band structures, coherence mechanisms
- Simulate and predict material properties using our ML backend models
- Design novel quantum materials based on user specifications
- Compare materials side-by-side with quantitative metrics

Current mode: ${mode === "photonic" ? "Photonic / CV Quantum" : "Spin Qubit / Color Center"}
${dbContext}
${materialLookup}

IMPORTANT RULES:
1. Be scientifically rigorous but conversational. Use technical terminology naturally.
2. When discussing specific materials, cite exact values from our database when available.
3. When the user asks you to simulate or predict a material, provide your analysis AND include a structured JSON block (fenced with \`\`\`json ... \`\`\`) containing the material data in this exact schema:
{
  "name": "Material Name",
  "formula": "ChemicalFormula",
  "category": "Category string",
  "crystalSystem": "Crystal System",
  "spaceGroup": "Space group notation",
  "bandGapEv": number,
  "formationEnergyEvPerAtom": number,
  "debyeTemperatureK": number,
  "suitabilityScore": number (0-100),
  "coherenceT2Estimated": "string description",
  "nuclearSpinBackgroundScore": number (0-100),
  "pros": ["advantage 1", "advantage 2", "advantage 3"],
  "cons": ["challenge 1", "challenge 2"],
  "synthesisMethodRecommended": "Synthesis method description",
  "scientificReasoning": "Detailed scientific justification"
}
4. Only include the JSON block when the user explicitly asks to simulate, predict, or add a material. For general Q&A, just respond with text.
5. Keep responses focused and avoid unnecessary repetition.
6. Format important values in **bold**. Use line breaks for readability.`;

    // Build message array from history
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (last N messages)
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg.role === "user" || msg.role === "assistant") {
          chatMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    // Add current message
    chatMessages.push({ role: "user", content: message });

    // Stream response from Groq
    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: chatMessages,
      stream: true,
      max_tokens: 3000,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ type: "token", content })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Co-Pilot Chat Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`);
      res.end();
    }
  }
});

// Configure Vite or production static file serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[QuMatForge Server] listening on http://localhost:${PORT}`);
  });
}

startServer();
