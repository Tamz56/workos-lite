// src/components/workspaces/FocusModeToggle.tsx
import React from 'react'
import { Target, Eye, EyeOff } from 'lucide-react'

interface FocusModeToggleProps {
  isActive: boolean
  onToggle: () => void
}

export const FocusModeToggle: React.FC<FocusModeToggleProps> = ({ isActive, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-lg transition-all duration-300 flex items-center gap-2 font-bold text-xs ${
        isActive 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 ring-2 ring-indigo-200' 
          : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
      }`}
      title={isActive ? "Disable Focus Mode" : "Enable Focus Mode"}
    >
      {isActive ? <EyeOff size={16} /> : <Target size={16} />}
      <span className="hidden md:inline">{isActive ? 'Focused' : 'Focus'}</span>
    </button>
  )
}
