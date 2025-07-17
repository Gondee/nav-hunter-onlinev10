'use client'

import React from 'react'

export interface AlertData {
  id: string
  companyName: string
  ticker: string
  confidenceScore: number
  alertHighlight: boolean
  formType: string
  filedAt: string
  delayString: string
  tradingViewUrl: string
  secFilingUrl: string
  details: Record<string, any>
}

interface AlertCardProps {
  alert: AlertData
}

export function AlertCard({ alert }: AlertCardProps) {
  const isGoldAlert = alert.alertHighlight === true
  
  const baseClasses = "p-4 my-2 rounded-lg border transition-all"
  const goldClasses = "border-nav-amber bg-nav-amber/10 alert-gold"
  const blueClasses = "border-nav-blue bg-nav-blue bg-opacity-10"
  
  return (
    <div className={`${baseClasses} ${isGoldAlert ? goldClasses : blueClasses}`}>
      {/* Header */}
      <div className="font-bold text-base mb-2">
        <span className={isGoldAlert ? "text-nav-amber" : "text-nav-blue"}>
          {alert.companyName || 'Unknown'} ({alert.ticker || 'N/A'}) - {alert.confidenceScore}%
        </span>
        <span className="text-nav-text-main text-xs ml-4 opacity-80">
          (Delay: {alert.delayString})
        </span>
      </div>
      
      {/* Details */}
      <div className="my-2 text-[13px] leading-relaxed">
        {Object.entries(alert.details).map(([key, value]) => {
          // Skip functional keys
          const functionalKeys = ['isAlertWorthy', 'confidenceScore', 'alertHighlight', 'textToSpeak']
          if (functionalKeys.includes(key)) return null
          
          return (
            <div key={key} className="mb-1">
              <strong className="text-nav-text-muted">{key}:</strong> {String(value)}
            </div>
          )
        })}
        <div className="mb-1">
          <strong className="text-nav-text-muted">Filing:</strong> {alert.formType} &nbsp;&nbsp;
          <strong className="text-nav-text-muted">Filed At:</strong> {alert.filedAt}
        </div>
      </div>
      
      {/* Links */}
      <div className="mt-3">
        <a 
          href={alert.tradingViewUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-nav-blue mr-5 font-bold no-underline hover:underline"
        >
          💹 TradingView
        </a>
        <a 
          href={alert.secFilingUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-nav-blue font-bold no-underline hover:underline"
        >
          📄 SEC Filing
        </a>
      </div>
    </div>
  )
}