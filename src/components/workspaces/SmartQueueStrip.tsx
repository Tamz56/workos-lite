// src/components/workspaces/SmartQueueStrip.tsx
import React from 'react'
import { AlertCircle, Calendar, ShieldCheck, Play, ChevronRight } from 'lucide-react'
import { QueueItem, QueueItemType } from '../../lib/smart/queue/resolveWorkspaceSmartQueue'

interface SmartQueueStripProps {
  items: QueueItem[]
  onItemClick: (item: QueueItem) => void
  onItemShown?: (identity: string) => void
  onDismiss?: () => void
}

export const SmartQueueStrip: React.FC<SmartQueueStripProps> = ({ items, onItemClick, onItemShown, onDismiss }) => {
  const reportedIdentities = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (!onItemShown) return
    items.forEach(item => {
      if (!reportedIdentities.current.has(item.identity)) {
        onItemShown(item.identity)
        reportedIdentities.current.add(item.identity)
      }
    })
  }, [items, onItemShown])

  if (items.length === 0) return null

  const getStyle = (type: QueueItemType) => {
    switch (type) {
      case 'overdue': return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-red-100'
      case 'today': return 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-indigo-100'
      case 'review': return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-emerald-100'
      default: return 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50 shadow-sm'
    }
  }

  const getIcon = (type: QueueItemType) => {
    switch (type) {
      case 'overdue': return <AlertCircle size={12} className="shrink-0" strokeWidth={3} />
      case 'today': return <Calendar size={12} className="shrink-0" strokeWidth={3} />
      case 'review': return <ShieldCheck size={12} className="shrink-0" strokeWidth={3} />
      default: return <Play size={12} className="shrink-0" strokeWidth={3} />
    }
  }

  return (
    <div className="w-full py-2 animate-in fade-in slide-in-from-top-2 duration-500 overflow-hidden shrink-0">
      <div className="flex items-center justify-between mb-1.5 px-1">
        <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-widest flex items-center gap-1.5 pl-1">
          <Play size={10} fill="currentColor" /> Workspace Smart Queue
        </h4>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-[10px] font-bold text-neutral-300 hover:text-neutral-500 transition-colors uppercase px-2"
          >
            Hide
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1 custom-scrollbar-hide">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all whitespace-nowrap active:scale-95 shadow-sm group ${getStyle(item.type)}`}
          >
            {getIcon(item.type)}
            <span className="truncate max-w-[200px]">{item.label}</span>
            <ChevronRight size={10} className="ml-1 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[8px]" />
          </button>
        ))}
      </div>
    </div>
  )
}
