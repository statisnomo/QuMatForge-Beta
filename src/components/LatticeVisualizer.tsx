import React, { useRef, useEffect, useState } from "react";
import { Material } from "../types";
import { Maximize2, Minimize2, RotateCcw, Info, Settings } from "lucide-react";

interface LatticeVisualizerProps {
  material: Material;
}

interface Atom3D {
  x: number;
  y: number;
  z: number;
  element: string;
  color: string;
  radius: number;
  isDefect?: boolean;
  isVacancy?: boolean;
}

interface Bond3D {
  fromIdx: number;
  toIdx: number;
}

export default function LatticeVisualizer({ material }: LatticeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction State
  const [rotation, setRotation] = useState({ x: 35, y: -45 });
  const [zoom, setZoom] = useState(1.0);
  const [viewMode, setViewMode] = useState<"ball-stick" | "space-fill">("ball-stick");
  const [highlightDefect, setHighlightDefect] = useState(true);
  const [isRotating, setIsRotating] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // Mouse drag tracking
  const mouseRef = useRef({ isDown: false, lastX: 0, lastY: 0 });

  // Generate atomic coordinates based on crystal system/formula
  const getAtomicStructure = (mat: Material): { atoms: Atom3D[]; bonds: Bond3D[] } => {
    const atoms: Atom3D[] = [];
    const bonds: Bond3D[] = [];

    const isSiC = mat.formula.includes("SiC");
    const isDiamond = mat.formula === "C (Diamond)";
    const isSi = mat.formula.includes("Si") && !isSiC && !mat.formula.includes("Y");
    const isYSO = mat.formula.includes("Y2SiO5") || mat.formula.includes("YSO");
    const isNbN = mat.formula.includes("NbN");
    const isBiSe = mat.formula.includes("Bi2Se3");

    // Helper: Add bond
    const addBond = (f: number, t: number) => {
      bonds.push({ fromIdx: f, toIdx: t });
    };

    if (isDiamond || isSi) {
      // Diamond cubic lattice structure
      const hostElement = isSi ? "Si" : "C";
      const hostColor = isSi ? "#4a90e2" : "#99aab8";
      const atomRadius = isSi ? 0.18 : 0.14;

      // Cubic lattice corners (-0.8 to 0.8 scale)
      const points = [
        { x: -0.8, y: -0.8, z: -0.8 }, // 0
        { x:  0.8, y: -0.8, z: -0.8 }, // 1
        { x: -0.8, y:  0.8, z: -0.8 }, // 2
        { x:  0.8, y:  0.8, z: -0.8 }, // 3
        { x: -0.8, y: -0.8, z:  0.8 }, // 4
        { x:  0.8, y: -0.8, z:  0.8 }, // 5
        { x: -0.8, y:  0.8, z:  0.8 }, // 6
        { x:  0.8, y:  0.8, z:  0.8 }, // 7
      ];

      points.forEach(p => {
        atoms.push({ ...p, element: hostElement, color: hostColor, radius: atomRadius });
      });

      // Face centers
      const faceCenters = [
        { x: 0, y: 0, z: -0.8 },   // 8 (bottom)
        { x: 0, y: 0, z: 0.8 },    // 9 (top)
        { x: 0, y: -0.8, z: 0 },   // 10 (front)
        { x: 0, y: 0.8, z: 0 },    // 11 (back)
        { x: -0.8, y: 0, z: 0 },   // 12 (left)
        { x: 0.8, y: 0, z: 0 },    // 13 (right)
      ];

      faceCenters.forEach(fc => {
        atoms.push({ ...fc, element: hostElement, color: hostColor, radius: atomRadius });
      });

      // Interstitial positions (diamond base)
      const tetrahedrals = [
        { x: -0.4, y: -0.4, z: -0.4 }, // 14
        { x:  0.4, y:  0.4, z: -0.4 }, // 15
        { x: -0.4, y:  0.4, z:  0.4 }, // 16
        { x:  0.4, y: -0.4, z:  0.4 }, // 17
      ];

      tetrahedrals.forEach(t => {
        atoms.push({ ...t, element: hostElement, color: hostColor, radius: atomRadius });
      });

      // Construct unit cell bonds
      // Outer box edges
      addBond(0, 1); addBond(1, 3); addBond(3, 2); addBond(2, 0);
      addBond(4, 5); addBond(5, 7); addBond(7, 6); addBond(6, 4);
      addBond(0, 4); addBond(1, 5); addBond(2, 6); addBond(3, 7);

      // Tetrahedral interstitial bonds
      addBond(14, 0); addBond(14, 8); addBond(14, 10); addBond(14, 12);
      addBond(15, 3); addBond(15, 8); addBond(15, 11); addBond(15, 13);
      addBond(16, 6); addBond(16, 9); addBond(16, 11); addBond(16, 12);
      addBond(17, 5); addBond(17, 9); addBond(17, 10); addBond(17, 13);

      // Insert Defect (e.g. NV Center: replace one carbon with Nitrogen and another with a vacancy)
      if (highlightDefect && isDiamond) {
        // Replace atom 14 with Nitrogen
        atoms[14] = {
          x: -0.4,
          y: -0.4,
          z: -0.4,
          element: "N",
          color: "#3b82f6", // Vibrant Blue
          radius: atomRadius * 1.1,
          isDefect: true
        };
        // Replace atom 0 with vacancy
        atoms[0] = {
          x: -0.8,
          y: -0.8,
          z: -0.8,
          element: "Vacancy",
          color: "rgba(239, 68, 68, 0.4)", // Translucent Neon Red
          radius: atomRadius * 0.9,
          isVacancy: true
        };
      } else if (highlightDefect && isSi) {
        // Substitutional Phosphorus dopant
        atoms[14] = {
          x: -0.4,
          y: -0.4,
          z: -0.4,
          element: "31P",
          color: "#f59e0b", // Warm Orange
          radius: atomRadius * 1.15,
          isDefect: true
        };
      }

    } else if (isSiC) {
      // Hexagonal Silicon Carbide wurtzite polytype
      // Define a hexagonal biprism layout
      const angles = [0, 60, 120, 180, 240, 300];
      const r = 0.7;

      // Hexagonal layers (Silicon at z=-0.5, Carbon at z=0.5 etc)
      angles.forEach((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = r * Math.cos(rad);
        const y = r * Math.sin(rad);

        // Silicon layer
        atoms.push({ x, y, z: -0.6, element: "Si", color: "#64748b", radius: 0.16 });
        // Carbon layer
        atoms.push({ x, y, z: 0.6, element: "C", color: "#334155", radius: 0.12 });
      });

      // Center poles
      atoms.push({ x: 0, y: 0, z: -0.6, element: "Si", color: "#64748b", radius: 0.16 });
      atoms.push({ x: 0, y: 0, z: 0.6, element: "C", color: "#334155", radius: 0.12 });

      // Connect hexagon perimeter
      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        // Si bonds
        addBond(i * 2, next * 2);
        // C bonds
        addBond(i * 2 + 1, next * 2 + 1);
        // Vertical Si-C bounds
        addBond(i * 2, i * 2 + 1);
      }
      // Center connections
      addBond(12, 13);
      for (let i = 0; i < 6; i++) {
        addBond(12, i * 2);
        addBond(13, i * 2 + 1);
      }

      // If Silicon vacancy highlight is enabled
      if (highlightDefect) {
        // Convert central Si atom (index 12) into a Silicon Vacancy defect
        atoms[12] = {
          x: 0,
          y: 0,
          z: -0.6,
          element: "Vacancy",
          color: "rgba(239, 68, 68, 0.4)",
          radius: 0.15,
          isVacancy: true
        };
      }

    } else if (isYSO) {
      // YSO: Monoclinic unit cell. Suggesting complex atomic layout of Yttrium, Silicon, Oxygen
      const lattice = [
        { x: -0.6, y: -0.6, z: -0.6, element: "Y", color: "#ec4899", radius: 0.18 }, // pink
        { x:  0.6, y: -0.6, z: -0.6, element: "Y", color: "#ec4899", radius: 0.18 },
        { x: -0.6, y:  0.6, z: -0.6, element: "Si", color: "#4f46e5", radius: 0.14 }, // indigo
        { x:  0.6, y:  0.6, z: -0.6, element: "O", color: "#ef4444", radius: 0.1 },  // red
        { x: -0.6, y: -0.6, z:  0.6, element: "O", color: "#ef4444", radius: 0.1 },
        { x:  0.6, y: -0.6, z:  0.6, element: "Si", color: "#4f46e5", radius: 0.14 },
        { x: -0.6, y:  0.6, z:  0.6, element: "Y", color: "#ec4899", radius: 0.18 },
        { x:  0.6, y:  0.6, z:  0.6, element: "Y", color: "#ec4899", radius: 0.18 },

        // Center complex
        { x: 0, y: 0, z: 0, element: "Er", color: "#10b981", radius: 0.2, isDefect: true } // Erbium dopant
      ];

      lattice.forEach(a => atoms.push(a));

      // Simple wireframe connections
      addBond(0, 1); addBond(1, 3); addBond(3, 2); addBond(2, 0);
      addBond(4, 5); addBond(5, 7); addBond(7, 6); addBond(6, 4);
      addBond(0, 4); addBond(1, 5); addBond(2, 6); addBond(3, 7);

      // Connect Erbium defect in the center to Oxygen coordinates
      if (highlightDefect) {
        addBond(8, 3);
        addBond(8, 4);
      } else {
        // replace Er with normal Yttrium if highlight is disabled
        atoms[8] = { x: 0, y: 0, z: 0, element: "Y", color: "#ec4899", radius: 0.18 };
      }

    } else if (isNbN) {
      // Cubic Rock Salt structure
      // Alternating Niobium (Nb, large, gray) and Nitrogen (N, small, cyan)
      const coords = [
        { x: -0.6, y: -0.6, z: -0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x:  0.0, y: -0.6, z: -0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x:  0.6, y: -0.6, z: -0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x: -0.6, y:  0.0, z: -0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x:  0.0, y:  0.0, z: -0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x:  0.6, y:  0.0, z: -0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x: -0.6, y:  0.6, z: -0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x:  0.0, y:  0.6, z: -0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x:  0.6, y:  0.6, z: -0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },

        // Second layer displaced in Z
        { x: -0.6, y: -0.6, z:  0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x:  0.0, y: -0.6, z:  0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x:  0.6, y: -0.6, z:  0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x: -0.6, y:  0.0, z:  0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x:  0.0, y:  0.0, z:  0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x:  0.6, y:  0.0, z:  0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x: -0.6, y:  0.6, z:  0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
        { x:  0.0, y:  0.6, z:  0.6, element: "Nb", color: "#94a3b8", radius: 0.18 },
        { x:  0.6, y:  0.6, z:  0.6, element: "N",  color: "#06b6d4", radius: 0.12 },
      ];

      coords.forEach(c => atoms.push(c));

      // Form some bonds between adjacent atoms
      addBond(0, 1); addBond(1, 2);
      addBond(3, 4); addBond(4, 5);
      addBond(6, 7); addBond(7, 8);
      addBond(0, 3); addBond(3, 6);
      addBond(1, 4); addBond(4, 7);
      addBond(2, 5); addBond(5, 8);

      // Connecting layers in Z
      addBond(0, 9); addBond(2, 11); addBond(6, 15); addBond(8, 17);
      addBond(9, 10); addBond(10, 11);
      addBond(15, 16); addBond(16, 17);

    } else {
      // General fall-back crystal structure (Tetragonal/Perovskite lookalike)
      const elements = mat.formula.replace(/[^A-Za-z]/g, " ").trim().split(/\s+/);
      const e1 = elements[0] || "A";
      const e2 = elements[1] || "B";
      const e3 = elements[2] || "O";

      // 8 corners
      const corners = [
        { x: -0.6, y: -0.6, z: -0.6 },
        { x:  0.6, y: -0.6, z: -0.6 },
        { x: -0.6, y:  0.6, z: -0.6 },
        { x:  0.6, y:  0.6, z: -0.6 },
        { x: -0.6, y: -0.6, z:  0.6 },
        { x:  0.6, y: -0.6, z:  0.6 },
        { x: -0.6, y:  0.6, z:  0.6 },
        { x:  0.6, y:  0.6, z:  0.6 },
      ];

      corners.forEach(p => {
        atoms.push({ ...p, element: e1, color: "#a855f7", radius: 0.16 }); // purple
      });

      // 1 center
      atoms.push({ x: 0, y: 0, z: 0, element: e2, color: "#3b82f6", radius: 0.22 }); // blue

      // 6 faces
      const faces = [
        { x:  0,  y:  0,  z: -0.6 },
        { x:  0,  y:  0,  z:  0.6 },
        { x:  0,  y: -0.6, z:  0 },
        { x:  0,  y:  0.6, z:  0 },
        { x: -0.6, y:  0,  z:  0 },
        { x:  0.6, y:  0,  z:  0 },
      ];

      faces.forEach(p => {
        atoms.push({ ...p, element: e3, color: "#ef4444", radius: 0.11 }); // red
      });

      // Connections
      addBond(0, 1); addBond(1, 3); addBond(3, 2); addBond(2, 0);
      addBond(4, 5); addBond(5, 7); addBond(7, 6); addBond(6, 4);
      addBond(0, 4); addBond(1, 5); addBond(2, 6); addBond(3, 7);

      // Connect center to faces (octahedron)
      for (let i = 9; i < 15; i++) {
        addBond(8, i);
      }
    }

    return { atoms, bonds };
  };

  const { atoms, bonds } = getAtomicStructure(material);

  // Projection logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Clear with elegant futuristic slate gradient background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.45 * zoom;

      // Rotation angles in radians
      const radX = (rotation.x * Math.PI) / 180;
      const radY = (rotation.y * Math.PI) / 180;

      // Projection calculations
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);

      // Project atoms
      const projectedAtoms = atoms.map((atom) => {
        // 1. Rotate around Y axis
        const x1 = atom.x * cosY - atom.z * sinY;
        const z1 = atom.x * sinY + atom.z * cosY;

        // 2. Rotate around X axis
        const y2 = atom.y * cosX - z1 * sinX;
        const z2 = atom.y * sinX + z1 * cosX;

        // 3. Perspective calculation (simple depth scale)
        const perspective = 3 / (3 + z2);
        const screenX = centerX + x1 * scale * perspective;
        const screenY = centerY + y2 * scale * perspective;

        return {
          ...atom,
          screenX,
          screenY,
          depth: z2, // useful for sorting back-to-front
          screenRadius: atom.radius * scale * (viewMode === "space-fill" ? 2.5 : 1.0) * perspective,
        };
      });

      // Sort bonds by average depth to render them in proper 3D order
      const projectedBonds = bonds.map((bond) => {
        const fromAtom = projectedAtoms[bond.fromIdx];
        const toAtom = projectedAtoms[bond.toIdx];
        const avgDepth = (fromAtom.depth + toAtom.depth) / 2;
        return {
          ...bond,
          avgDepth,
          fromX: fromAtom.screenX,
          fromY: fromAtom.screenY,
          toX: toAtom.screenX,
          toY: toAtom.screenY,
        };
      });

      // Draw grid/bounding box floor in the background for architectural depth
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1;
      const floorSize = scale * 0.9;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const offset = (i / 2) * floorSize;
        // Draw floor longitudinal/latitudinal lines
        // Projecting a ground plane at y = 1.0
        const projFloorPoint = (lx: number, lz: number) => {
          const x1 = lx * cosY - lz * sinY;
          const z1 = lx * sinY + lz * cosY;
          const y2 = 0.8 * cosX - z1 * sinX;
          const z2 = 0.8 * sinX + z1 * cosX;
          const perspective = 3 / (3 + z2);
          return {
            x: centerX + x1 * scale * perspective,
            y: centerY + y2 * scale * perspective
          };
        };

        const p1 = projFloorPoint(-0.8, (i / 2) * 0.8);
        const p2 = projFloorPoint(0.8, (i / 2) * 0.8);
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        const p3 = projFloorPoint((i / 2) * 0.8, -0.8);
        const p4 = projFloorPoint((i / 2) * 0.8, 0.8);
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
      }
      ctx.stroke();

      // Rendering passes:
      // Since we have atoms and bonds, we mix-render them based on depth.
      // 1. Draw background bonds
      // 2. Draw background atoms
      // 3. Draw foreground bonds
      // 4. Draw foreground atoms
      // Alternatively, we can sort all drawables (both atoms and bonds) together by depth!
      // This is the cleanest way to do 3D transparency/occlusion.

      type Drawable =
        | { type: "atom"; index: number; depth: number }
        | { type: "bond"; index: number; depth: number };

      const drawables: Drawable[] = [];
      projectedAtoms.forEach((a, idx) => drawables.push({ type: "atom", index: idx, depth: a.depth }));
      projectedBonds.forEach((b, idx) => drawables.push({ type: "bond", index: idx, depth: b.avgDepth }));

      // Sort descending (largest depth = furthest away gets drawn first)
      drawables.sort((a, b) => b.depth - a.depth);

      drawables.forEach((item) => {
        if (item.type === "bond") {
          const b = projectedBonds[item.index];
          // Determine bond color based on atom colors
          const atomFrom = projectedAtoms[b.fromIdx];
          const atomTo = projectedAtoms[b.toIdx];

          const gradient = ctx.createLinearGradient(b.fromX, b.fromY, b.toX, b.toY);
          gradient.addColorStop(0, atomFrom.isVacancy ? "rgba(239, 68, 68, 0.1)" : "rgba(148, 163, 184, 0.3)");
          gradient.addColorStop(1, atomTo.isVacancy ? "rgba(239, 68, 68, 0.1)" : "rgba(148, 163, 184, 0.3)");

          ctx.beginPath();
          ctx.moveTo(b.fromX, b.fromY);
          ctx.lineTo(b.toX, b.toY);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = viewMode === "space-fill" ? 1 : 2;
          ctx.stroke();
        } else {
          const a = projectedAtoms[item.index];

          if (a.isVacancy) {
            // Draw vacancy as a dashed, glowing circular outline
            ctx.save();
            ctx.beginPath();
            ctx.arc(a.screenX, a.screenY, a.screenRadius, 0, 2 * Math.PI);
            ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();

            // Tiny pulse core
            ctx.beginPath();
            ctx.arc(a.screenX, a.screenY, 3, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
            ctx.fill();
            ctx.restore();
          } else {
            // Standard atom rendering
            ctx.save();
            ctx.beginPath();
            ctx.arc(a.screenX, a.screenY, Math.max(2, a.screenRadius), 0, 2 * Math.PI);

            // Shading gradient for realistic 3D sphere look
            const highlightX = a.screenX - a.screenRadius * 0.3;
            const highlightY = a.screenY - a.screenRadius * 0.3;
            const radGradient = ctx.createRadialGradient(
              highlightX,
              highlightY,
              a.screenRadius * 0.05,
              a.screenX,
              a.screenY,
              a.screenRadius
            );

            radGradient.addColorStop(0, "#ffffff");
            radGradient.addColorStop(0.2, a.color);
            radGradient.addColorStop(1, darkenColor(a.color, 0.4));

            ctx.fillStyle = radGradient;

            // Shadows/glow for defect centers
            if (a.isDefect) {
              ctx.shadowColor = a.color;
              ctx.shadowBlur = 15;
            }

            ctx.fill();

            // Atom Element text label overlay (only in ball-stick and when visible enough)
            if (viewMode === "ball-stick" && a.screenRadius > 8) {
              ctx.fillStyle = "#ffffff";
              ctx.font = `bold ${Math.max(9, Math.round(a.screenRadius * 0.8))}px Inter, sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.shadowBlur = 0; // clear shadow for text
              ctx.fillText(a.element, a.screenX, a.screenY);
            }

            ctx.restore();
          }
        }
      });
    };

    const darkenColor = (col: string, amt: number) => {
      // Very simple helper to darken hex/rgb colors for 3D sphere shading
      if (col.startsWith("#")) {
        let num = parseInt(col.slice(1), 16);
        let r = (num >> 16) - Math.round(255 * amt);
        let g = ((num >> 8) & 0x00ff) - Math.round(255 * amt);
        let b = (num & 0x0000ff) - Math.round(255 * amt);
        r = Math.max(0, r);
        g = Math.max(0, g);
        b = Math.max(0, b);
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      }
      return col; // fallback
    };

    // Auto rotate loop if enabled
    let lastTime = 0;
    const animate = (time: number) => {
      if (autoRotate && !mouseRef.current.isDown) {
        setRotation((prev) => ({
          x: prev.x,
          y: (prev.y + 0.15) % 360,
        }));
      }
      render();
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [atoms, bonds, rotation, zoom, viewMode, highlightDefect, autoRotate]);

  // Adjust canvas size to match layout container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = Math.max(380, container.clientHeight || 400);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mouse drag handles
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mouseRef.current = {
      isDown: true,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    setIsRotating(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mouseRef.current.isDown) return;

    const deltaX = e.clientX - mouseRef.current.lastX;
    const deltaY = e.clientY - mouseRef.current.lastY;

    setRotation((prev) => ({
      x: Math.min(85, Math.max(-85, prev.x - deltaY * 0.5)),
      y: (prev.y + deltaX * 0.5) % 360,
    }));

    mouseRef.current.lastX = e.clientX;
    mouseRef.current.lastY = e.clientY;
  };

  const handleMouseUpOrLeave = () => {
    mouseRef.current.isDown = false;
    setIsRotating(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom((prev) => Math.min(2.0, Math.max(0.4, prev - e.deltaY * 0.001)));
  };

  const resetView = () => {
    setRotation({ x: 35, y: -45 });
    setZoom(1.0);
  };

  // Get legend elements based on formula
  const getLegendElements = () => {
    const symbols = new Set<string>();
    const mapping: { [key: string]: string } = {};

    atoms.forEach(a => {
      if (a.element !== "Vacancy") {
        symbols.add(a.element);
        mapping[a.element] = a.color;
      }
    });

    return Array.from(symbols).map(s => ({
      element: s,
      color: mapping[s]
    }));
  };

  return (
    <div id="lattice-visualizer-container" className="flex flex-col h-full bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Maximize2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">3D Crystal Lattice Model</h3>
            <p className="text-xs text-slate-400 font-mono">{material.crystalSystem} system · {material.spaceGroup}</p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1 text-xs rounded-md font-medium border transition-all ${
              autoRotate
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300"
            }`}
          >
            {autoRotate ? "Auto-Spin On" : "Spin Stopped"}
          </button>
          <button
            onClick={resetView}
            title="Reset view angle"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800/50 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="relative flex-grow min-h-[380px] bg-slate-950/70 select-none cursor-grab active:cursor-grabbing">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          onWheel={handleWheel}
          className="w-full h-full block"
        />

        {/* Floating helper notice */}
        <div className="absolute top-4 left-4 p-2 bg-slate-900/80 border border-slate-800 rounded-lg max-w-[210px] pointer-events-none backdrop-blur">
          <div className="flex items-start space-x-2">
            <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-slate-300 leading-normal">
              Click & Drag to rotate lattice. Scroll to zoom.
            </p>
          </div>
        </div>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl max-w-[260px] backdrop-blur">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-2">Atom Species</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {getLegendElements().map((el) => (
              <div key={el.element} className="flex items-center space-x-1.5 text-xs text-slate-200">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block border border-white/10"
                  style={{ backgroundColor: el.color }}
                />
                <span className="font-medium">{el.element}</span>
              </div>
            ))}
            {highlightDefect && atoms.some(a => a.isVacancy) && (
              <div className="flex items-center space-x-1.5 text-xs text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-rose-500 bg-rose-500/20" />
                <span className="font-medium text-rose-300">Vacancy</span>
              </div>
            )}
          </div>
        </div>

        {/* Control floating sheet */}
        <div className="absolute right-4 bottom-4 p-3 bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur flex flex-col space-y-2.5">
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase font-mono tracking-wider mb-2">View Settings</h4>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewMode("ball-stick")}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                  viewMode === "ball-stick"
                    ? "bg-slate-800 text-emerald-400 shadow"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Ball-Stick
              </button>
              <button
                onClick={() => setViewMode("space-fill")}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${
                  viewMode === "space-fill"
                    ? "bg-slate-800 text-emerald-400 shadow"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                Space-Fill
              </button>
            </div>
          </div>

          {material.defectCharacteristics && (
            <label className="flex items-center space-x-2 cursor-pointer select-none border-t border-slate-800 pt-2">
              <input
                type="checkbox"
                checked={highlightDefect}
                onChange={(e) => setHighlightDefect(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5"
              />
              <span className="text-[10px] font-medium text-slate-300">Highlight Defect/Dopant</span>
            </label>
          )}
        </div>
      </div>

      {/* Crystal Metrics Footer */}
      <div className="grid grid-cols-3 gap-px bg-slate-800/80 border-t border-slate-800 text-center font-mono text-[11px] text-slate-400">
        <div className="bg-slate-900/40 py-2.5">
          <span className="block text-slate-500 text-[9px] uppercase tracking-wider">a / b / c (Å)</span>
          <span className="text-slate-200 font-medium">
            {material.latticeParameters?.a.toFixed(3) || "N/A"} · {material.latticeParameters?.b.toFixed(3) || "N/A"} · {material.latticeParameters?.c.toFixed(3) || "N/A"}
          </span>
        </div>
        <div className="bg-slate-900/40 py-2.5">
          <span className="block text-slate-500 text-[9px] uppercase tracking-wider">Angles (α/β/γ)</span>
          <span className="text-slate-200 font-medium">
            {material.latticeParameters?.alpha || 90}° · {material.latticeParameters?.beta || 90}° · {material.latticeParameters?.gamma || 90}°
          </span>
        </div>
        <div className="bg-slate-900/40 py-2.5">
          <span className="block text-slate-500 text-[9px] uppercase tracking-wider">Formation Energy</span>
          <span className={`font-semibold ${material.formationEnergyEvPerAtom < -1 ? "text-emerald-400" : material.formationEnergyEvPerAtom < 0 ? "text-teal-400" : "text-amber-400"}`}>
            {material.formationEnergyEvPerAtom.toFixed(2)} eV/atom
          </span>
        </div>
      </div>
    </div>
  );
}
