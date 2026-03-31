// src/components/workspaces/SmartViewHint.tsx
'use client'

import React from 'react';
import { Lightbulb, X, Check } from 'lucide-react';

interface SmartViewHintProps {
  label: string
  reason: string
  confidence?: 'low' | 'medium' | 'high'
  onAccept: () => void
  onDismiss: () => void
}

export function SmartViewHint(props: SmartViewHintProps) {
  if (props.confidence === 'low') return null
  
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50/30 px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 p-1 rounded-full bg-indigo-100 text-indigo-600 shrink-0">
          <Lightbulb size={14} />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-indigo-900">Suggested view: {props.label}</div>
          <div className="text-indigo-600/70 truncate">{props.reason}</div>
        </div>
      </div>
      <div className="ml-4 flex items-center gap-2 shrink-0">
        <button 
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-bold text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-95 shadow-sm" 
          onClick={props.onDismiss}
        >
          <X size={14} />
          <span>Dismiss</span>
        </button>
        <button 
          className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-600 px-4 py-1.5 font-bold text-white hover:bg-indigo-700 transition-all active:scale-95 shadow-sm shadow-indigo-200/50" 
          onClick={props.onAccept}
        >
          <Check size={14} />
          <span>Switch</span>
        </button>
      </div>
    </div>
  )
}
