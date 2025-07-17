'use client'

import React, { useRef, useEffect } from 'react'

export interface LogEntry {
  id: string
  timestamp: string
  message: string
  level: 'info' | 'error' | 'warn' | 'skipped'
}

interface ConsoleLogProps {
  logs?: LogEntry[]
  maxEntries?: number
}

export function ConsoleLog({ logs = [], maxEntries = 200 }: ConsoleLogProps) {
  const consoleRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])
  
  // Limit the number of log entries displayed
  const displayLogs = logs.slice(-maxEntries)
  
  return (
    <div 
      ref={consoleRef}
      className="fixed bottom-0 left-0 right-0 h-[200px] bg-[#111] border-t border-nav-border p-2.5 overflow-y-auto text-xs"
    >
      {displayLogs.length === 0 ? (
        <div className="log-entry log-info">
          <span className="log-time">[{new Date().toLocaleTimeString()}]</span> System initialized. Click page to enable audio.
        </div>
      ) : (
        displayLogs.map((log) => (
          <div key={log.id} className={`log-entry log-${log.level}`}>
            <span className="log-time">[{log.timestamp}]</span> {log.message}
          </div>
        ))
      )}
    </div>
  )
}