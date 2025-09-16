import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { SAFIcon } from './Icons';

interface SimulationCorePanelProps {
  onSimulationPrepared: () => void;
}

const EXAMPLE_SIMULATION = {
  objective: 'Develop a logistics plan for establishing the first self-sufficient human colony on Mars.',
  parameters: 'Initial crew: 8 astronauts. Mission duration: 700 Sols. Launch vehicle: Reusable super-heavy lift rocket. Key cargo: In-Situ Resource Utilization (ISRU) unit for water/oxygen, modular habitat, solar arrays, hydroponic farm, 3D printer for spare parts.',
  constraints: 'Maximum payload mass of 150 metric tons per launch. Must achieve self-sufficiency in water and oxygen within 100 Sols. Food production must meet 50% of caloric needs within 200 Sols. Total initial budget: $50 billion.',
};

const SectionInput: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder: string;
    rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 3 }) => (
    <div className="mb-4">
        <label className="block text-sm font-semibold text-cyan-300 mb-1.5">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full bg-cyan-900/50 border border-cyan-500/30 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-y"
        />
    </div>
);

export const SimulationCorePanel: React.FC<SimulationCorePanelProps> = ({ onSimulationPrepared }) => {
  const { createCanvas } = useWorkspace();
  const [objective, setObjective] = useState(EXAMPLE_SIMULATION.objective);
  const [parameters, setParameters] = useState(EXAMPLE_SIMULATION.parameters);
  const [constraints, setConstraints] = useState(EXAMPLE_SIMULATION.constraints);

  const handleCreateSimulationCanvas = async () => {
    if (!objective.trim()) {
        alert("Please define an objective for the simulation.");
        return;
    }

    const canvasName = `Sim: ${objective.substring(0, 30)}...`;
    const promptContent = `# SIMULATION BRIEF

## Objective
${objective}

## Parameters & Variables
${parameters.trim() ? parameters : "*No specific parameters provided.*"}

## Constraints & Rules
${constraints.trim() ? constraints : "*No specific constraints provided.*"}

---
**PROMPT:**
Based on the simulation brief above, run a detailed analysis. Model the problem, evaluate the parameters against the constraints, and generate a comprehensive report detailing the optimal solution or outcome. Show your step-by-step reasoning in the Task Log.`;
    
    await createCanvas(canvasName, [{ type: 'text', content: promptContent }]);
    onSimulationPrepared(); // Switch tab back to 'files'
  };

  const handleLoadExample = () => {
      setObjective(EXAMPLE_SIMULATION.objective);
      setParameters(EXAMPLE_SIMULATION.parameters);
      setConstraints(EXAMPLE_SIMULATION.constraints);
  };
  
  const handleClear = () => {
      setObjective('');
      setParameters('');
      setConstraints('');
  };

  const isButtonDisabled = !objective.trim();

  return (
    <div className="h-full flex flex-col p-4">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-cyan-500/20">
            <SAFIcon className="w-6 h-6 text-cyan-400 text-glow" />
            <h2 className="text-lg font-bold text-cyan-300 text-glow">Simulation Core</h2>
        </div>
        <p className="text-sm text-cyan-400/80 mb-4">
            Define a complex problem. The AI will model the scenario, run an analysis, and generate a report canvas. Try the Mars Colony example below.
        </p>
        <div className="flex-grow overflow-y-auto pr-2">
            <SectionInput
                label="Objective"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g., Design a more efficient, non-toxic battery chemistry."
                rows={2}
            />
            <SectionInput
                label="Parameters & Variables"
                value={parameters}
                onChange={(e) => setParameters(e.target.value)}
                placeholder="e.g., Anode materials: Silicon, Graphene. Cathode materials: LFP, NMC. Electrolyte: Solid-state polymer."
                rows={4}
            />
            <SectionInput
                label="Constraints & Rules"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="e.g., Must exceed 500 Wh/kg energy density. Must be stable up to 80°C. Must not use cobalt."
                rows={4}
            />
        </div>
        <div className="mt-2 pt-2 border-t border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
                 <button
                    onClick={handleLoadExample}
                    className="flex-1 text-center bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium py-1.5 px-3 rounded-md transition-all text-xs"
                >
                    Load Example
                </button>
                 <button
                    onClick={handleClear}
                    className="flex-1 text-center bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-medium py-1.5 px-3 rounded-md transition-all text-xs"
                >
                    Clear Form
                </button>
            </div>
             <button
                onClick={handleCreateSimulationCanvas}
                disabled={isButtonDisabled}
                className="w-full text-center bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-bold py-2 px-4 rounded-md transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-500/20"
            >
                Prepare Simulation Canvas
            </button>
        </div>
    </div>
  );
};