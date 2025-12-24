import React from 'react';
import { ContextType } from '../types';
import { Sun, Moon, Briefcase, Dumbbell, Coffee, CloudRain } from 'lucide-react';

interface ContextSelectorProps {
  currentContext: ContextType;
  onContextChange: (c: ContextType) => void;
}

const ContextSelector: React.FC<ContextSelectorProps> = ({ currentContext, onContextChange }) => {
  const contexts = [
    { type: ContextType.Morning, icon: Sun, label: 'Morning' },
    { type: ContextType.Focus, icon: Briefcase, label: 'Focus' },
    { type: ContextType.Workout, icon: Dumbbell, label: 'Workout' },
    { type: ContextType.Chill, icon: Coffee, label: 'Chill' },
    { type: ContextType.Party, icon: Sun, label: 'Party' }, // Reusing Sun for party for simplicity
    { type: ContextType.Rainy, icon: CloudRain, label: 'Rainy' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar">
      {contexts.map((ctx) => (
        <button
          key={ctx.type}
          onClick={() => onContextChange(ctx.type)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border
            ${currentContext === ctx.type 
              ? 'bg-white text-black border-white' 
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'}
          `}
        >
          <ctx.icon size={16} />
          {ctx.label}
        </button>
      ))}
    </div>
  );
};

export default ContextSelector;