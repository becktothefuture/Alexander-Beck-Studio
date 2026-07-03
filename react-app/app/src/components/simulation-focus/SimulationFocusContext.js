import { createContext, useContext } from 'react';

export const SimulationFocusContext = createContext(null);

export function useSimulationFocus() {
  const context = useContext(SimulationFocusContext);
  if (!context) {
    throw new Error('Simulation focus components must be rendered inside SimulationFocusProvider.');
  }
  return context;
}
