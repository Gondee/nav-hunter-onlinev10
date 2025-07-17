'use client'

import React from 'react'

interface StatusPanelProps {
  processed: number
  alerts: number
  uptime: string
  wsStatus: string
  wsStatusColor?: string
}

export function StatusPanel({ processed, alerts, uptime, wsStatus, wsStatusColor }: StatusPanelProps) {
  const getStatusColor = () => {
    if (wsStatusColor) return wsStatusColor
    
    switch (wsStatus) {
      case 'Live':
        return 'var(--nav-accent-green)'
      case 'Receiving':
        return 'var(--nav-text-main)'
      case 'Error':
        return 'var(--nav-accent-red)'
      case 'Off':
      default:
        return 'var(--nav-text-muted)'
    }
  }
  
  return (
    <div className="panel">
      <div className="flex gap-5">
        {/* Processed Count */}
        <div className="text-center">
          <div className="text-xl font-bold">{processed}</div>
          <div className="text-xs text-nav-text-muted">Processed</div>
        </div>
        
        {/* Alerts Count */}
        <div className="text-center">
          <div className="text-xl font-bold">{alerts}</div>
          <div className="text-xs text-nav-text-muted">Alerts</div>
        </div>
        
        {/* Uptime */}
        <div className="text-center">
          <div className="text-xl font-bold">{uptime}</div>
          <div className="text-xs text-nav-text-muted">Uptime</div>
        </div>
        
        {/* WebSocket Status */}
        <div className="text-center">
          <div 
            className="text-xl font-bold transition-colors duration-300"
            style={{ color: getStatusColor() }}
          >
            {wsStatus}
          </div>
          <div className="text-xs text-nav-text-muted">Connection</div>
        </div>
      </div>
    </div>
  )
}