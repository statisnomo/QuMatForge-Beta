export interface LatticeParameters {
  a: number;
  b: number;
  c: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface DefectCharacteristics {
  defectName: string;
  spinState: string;
  zeroPhononLineEv?: number;
  opticalTransitionWavelengthNm?: number;
  opticalAccessibility: string;
}

export interface Material {
  id: string;
  name: string;
  formula: string;
  category: string;
  crystalSystem: string;
  spaceGroup: string;
  bandGapEv: number;
  formationEnergyEvPerAtom: number;
  debyeTemperatureK: number;
  suitabilityScore: number;
  coherenceT2Estimated: string;
  defectCharacteristics?: DefectCharacteristics;
  nuclearSpinBackgroundScore: number;
  pros: string[];
  cons: string[];
  latticeParameters?: LatticeParameters;
  synthesisMethodRecommended: string;
  scientificReasoning: string;
  isCustom?: boolean;
  // Photonic mode fields
  mode?: "spin" | "photonic";
  squeezingDb?: number;
  refractiveIndex?: number;
  piezoelectricModulus?: number;
  transmissivity?: number;
  photonicScore?: number;
  rEstimated?: number;
  materialId?: string;
}

export interface DesignProposal {
  formula: string;
  crystalSystem: string;
  estimatedTcK: number;
  suitabilityJustification: string;
  keyAdvantage: string;
  synthesisDifficulty: "Low" | "Medium" | "High";
  substrateCompatibility?: string;
}

export interface DesignResult {
  compounds: DesignProposal[];
  overallAssessment: string;
}
