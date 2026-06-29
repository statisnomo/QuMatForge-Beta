# QuMatForge

QuMatForge is a Dual-Mode Quantum Materials Discovery Engine. It allows users to explore, predict, and design materials for two distinct quantum technology domains:
1. **Spin Qubits & Color Centers**
2. **Photonic & Continuous-Variable (CV) Quantum Systems**

The application leverages a modern React/Vite frontend and an Express/Node.js backend, powered by the **Groq LLM API (Llama 3.3 70B)** for rapid material property inference and design suggestions.

---BLSHHHHHHHBSLHUYTUYETY

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)

You will also need a **Groq API Key**. You can obtain a free API key from the [Groq Console](https://console.groq.com/).

---

## Installation

1. **Clone the repository** (if you haven't already).

2. **Install dependencies**
   Navigate to the root of the project (where this `README.md` and `package.json` are located) and run:
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory (or copy `.env.example` if it exists) and add your Groq API key:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Ensure Data Files are Present**
   The application requires the photonic materials dataset to be in the root directory:
   - `photonic_final_candidates.csv`

---

## Running Locally

To start the development server (which concurrently starts both the Vite frontend and the Express backend):

```bash
npm run dev
```

- The application will be available at: **http://localhost:3000**
- Any changes to the React components (`src/`) will hot-reload automatically.
- Any changes to `server.ts` will restart the backend API.

---

## Building for Production

If you need to build the optimized production version:

1. Run the build script:
   ```bash
   npm run build
   ```
   This will bundle the React frontend into `dist/` and compile the server into `dist/server.cjs`.

2. Start the production server:
   ```bash
   npm run start
   ```
   The application will again be available at **http://localhost:3000**.

---

## Project Structure

- `src/` - React frontend components (App, UI widgets, Types).
- `server.ts` - Express backend. Handles API routing, CSV parsing for photonic materials, and Groq LLM integration.
- `photonic_final_candidates.csv` - The pre-calculated ML dataset for the Photonic Quantum mode.
- `dist/` - Generated after running the build step.

## Features & Usage

Use the **Mode Toggle** in the sidebar to switch between Spin Qubit and Photonic modes:
- **Materials Explorer:** Browse predefined and custom materials. View domain-specific stats like T₂ Coherence (Spin) or Squeezing dB (Photonic).
- **AI Compound Simulator:** Enter a chemical formula and predict its viability for quantum applications.
- **AI Blueprint Designer:** Enter target parameters (e.g., "Noncentrosymmetric high-refractive index crystal") and let the LLM design a theoretical material tailored to your specs.
