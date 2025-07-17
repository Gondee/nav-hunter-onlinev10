'use client'

import React, { useRef, useEffect } from 'react'

export interface AILogEntry {
  id: string
  timestamp: string
  message: string
  level: 'info' | 'analysis' | 'hit' | 'error'
  details?: {
    request: string
    response: string
  }
}

interface AITerminalProps {
  logs?: AILogEntry[]
}

export function AITerminal({ logs = [] }: AITerminalProps) {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [selectedLog, setSelectedLog] = React.useState<AILogEntry | null>(null)
  
  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs])
  
  const getLogColor = (level: AILogEntry['level']) => {
    switch (level) {
      case 'analysis':
        return 'var(--nav-accent-blue)'
      case 'hit':
        return 'var(--nav-accent-amber)'
      case 'error':
        return 'var(--nav-accent-red)'
      case 'info':
      default:
        return 'var(--nav-text-main)'
    }
  }
  
  return (
    <>
      {/* AI Terminal Panel */}
      <div className="fixed top-2.5 right-2.5 w-[400px] h-[calc(100vh-20px)] border border-nav-border bg-nav-bg-panel/70 backdrop-blur-xs p-2.5 overflow-y-auto text-xs z-[1000] rounded-lg">
        <h3 className="text-nav-blue mt-0 mb-3">🤖 AI Analysis Terminal</h3>
        
        <div ref={logContainerRef} className="overflow-y-auto max-h-[calc(100%-40px)]">
          {logs.length === 0 ? (
            <div style={{ color: 'var(--nav-text-main)' }}>
              [READY] ChatGPT-4o-mini configured.
            </div>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id}
                style={{ color: getLogColor(log.level), margin: '2px 0' }}
              >
                [{log.timestamp}] {log.message}
                {log.details && (
                  <span 
                    className="cursor-pointer underline text-nav-text-muted ml-1"
                    onClick={() => setSelectedLog(log)}
                  >
                    (Details)
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Details Modal */}
      {selectedLog && selectedLog.details && (
        <div 
          className="fixed inset-0 bg-black/70 z-[10000] flex justify-center items-center backdrop-blur-xs"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-nav-bg-panel w-[80vw] max-w-[1400px] h-[85vh] p-5 rounded-lg border border-nav-border shadow-[0_5px_25px_rgba(0,0,0,0.5)] relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <span 
              className="absolute top-2.5 right-5 text-3xl text-nav-text-muted cursor-pointer transition-colors hover:text-nav-text-main"
              onClick={() => setSelectedLog(null)}
            >
              &times;
            </span>
            
            <div className="overflow-y-auto h-full">
              <div className="mb-5">
                <h4 className="text-nav-blue mt-0 border-b border-nav-border pb-1">
                  Request Sent to AI
                </h4>
                <pre className="whitespace-pre-wrap break-words text-xs bg-nav-bg-main p-2.5 rounded max-h-[35vh] overflow-y-auto">
                  {selectedLog.details.request}
                </pre>
              </div>
              
              <div className="mb-5">
                <h4 className="text-nav-blue mt-0 border-b border-nav-border pb-1">
                  Raw Response from AI
                </h4>
                <pre className="whitespace-pre-wrap break-words text-xs bg-nav-bg-main p-2.5 rounded max-h-[35vh] overflow-y-auto">
                  {selectedLog.details.response}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}