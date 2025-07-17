'use client'

import React from 'react'

interface ConfigPanelProps {
  confidence: number
  onConfidenceChange: (value: number) => void
  formTypes: string[]
  onFormTypesChange: (types: string[]) => void
  testTicker: string
  onTestTickerChange: (value: string) => void
  onStartMonitoring: () => void
  onStopMonitoring: () => void
  onReplayLog: () => void
  onClearAlerts: () => void
  onShutdownServer: () => void
  onEnableNotifications: () => void
  onTestTicker: () => void
  isMonitoring: boolean
  isTesting: boolean
  secApiKey: string
  onSecApiKeyChange: (value: string) => void
  openaiApiKey: string
  onOpenaiApiKeyChange: (value: string) => void
}

const FORM_TYPE_OPTIONS = [
  { value: '8-K', label: '8-K', title: 'Standard corporate report of material events', defaultChecked: true },
  { value: '10-Q', label: '10-Q', title: 'Quarterly corporate report', defaultChecked: true },
  { value: '10-K', label: '10-K', title: 'Annual corporate report', defaultChecked: true },
  { value: 'S-1', label: 'S-1', title: 'IPO registration statement', defaultChecked: false },
  { value: '424B4', label: '424B4', title: 'Prospectus for offerings', defaultChecked: false },
  { value: 'N-CSR', label: 'N-CSR', title: 'Annual/Semi-annual fund report', defaultChecked: false },
  { value: 'N-PORT', label: 'N-PORT', title: 'Monthly fund portfolio holdings', defaultChecked: false },
  { value: '497', label: '497', title: 'Fund prospectus supplement', defaultChecked: false },
]

export function ConfigPanel(props: ConfigPanelProps) {
  const handleFormTypeToggle = (formType: string) => {
    const newTypes = props.formTypes.includes(formType)
      ? props.formTypes.filter(t => t !== formType)
      : [...props.formTypes, formType]
    props.onFormTypesChange(newTypes)
  }
  
  return (
    <div className="panel">
      <h3 className="text-lg font-semibold mb-4">Configuration</h3>
      
      {/* Button Group */}
      <div className="mb-4 pb-4 border-b border-nav-border">
        <button 
          className="btn"
          onClick={props.onStartMonitoring}
          disabled={props.isMonitoring}
        >
          ▶ Start Real Time Detection
        </button>
        <button 
          className="btn"
          onClick={props.onStopMonitoring}
          disabled={!props.isMonitoring}
        >
          ■ Stop
        </button>
        <button 
          className="btn !bg-nav-purple hover:!bg-nav-purple/80"
          onClick={props.onReplayLog}
          disabled={props.isMonitoring}
        >
          ⟳ Replay Log File
        </button>
        <button 
          className="btn !bg-gray-600 hover:!bg-gray-500"
          onClick={props.onClearAlerts}
        >
          Clear Alerts
        </button>
        <button 
          className="btn !bg-nav-red hover:!bg-nav-red/80"
          onClick={props.onShutdownServer}
          disabled={props.isMonitoring}
        >
          Shutdown Server
        </button>
        <button 
          className="btn !bg-nav-green hover:!bg-nav-green/80"
          onClick={props.onEnableNotifications}
          disabled={props.isMonitoring}
        >
          Enable Notifications
        </button>
      </div>
      
      {/* Confidence Input */}
      <div className="flex items-center my-2.5">
        <label className="inline-block w-[120px] text-nav-text-muted">Confidence:</label>
        <input 
          type="number" 
          value={props.confidence}
          onChange={(e) => props.onConfidenceChange(Number(e.target.value))}
          min="0"
          max="100"
          className="w-[60px]"
        />
      </div>
      
      {/* Form Types */}
      <div className="my-2.5">
        <label className="block mb-2.5 text-nav-text-muted">Form Types:</label>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pl-0">
          {FORM_TYPE_OPTIONS.map(option => (
            <label 
              key={option.value}
              title={option.title}
              className="m-0 cursor-pointer flex items-center text-xs"
            >
              <input 
                type="checkbox"
                checked={props.formTypes.includes(option.value)}
                onChange={() => handleFormTypeToggle(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>
      
      <hr className="border-nav-border my-4" />
      
      {/* Test Ticker */}
      <div className="flex items-center my-2.5">
        <label className="inline-block w-[120px] text-nav-text-muted">Test Ticker:</label>
        <input 
          type="text"
          value={props.testTicker}
          onChange={(e) => props.onTestTickerChange(e.target.value.toUpperCase())}
          placeholder="e.g., MSTR"
          className="flex-1 uppercase"
        />
        <button 
          className="btn"
          onClick={props.onTestTicker}
          disabled={props.isMonitoring || props.isTesting}
        >
          {props.isTesting ? 'Testing...' : 'Test Ticker'}
        </button>
      </div>
      
      <hr className="border-nav-border my-5" />
      
      {/* API Keys */}
      <div className="flex items-center my-2.5">
        <label className="inline-block w-[120px] text-nav-text-muted">SEC API Key:</label>
        <input 
          type="password"
          value={props.secApiKey}
          onChange={(e) => props.onSecApiKeyChange(e.target.value)}
          className="flex-1"
        />
      </div>
      
      <div className="flex items-center my-2.5">
        <label className="inline-block w-[120px] text-nav-text-muted">OpenAI API Key:</label>
        <input 
          type="password"
          value={props.openaiApiKey}
          onChange={(e) => props.onOpenaiApiKeyChange(e.target.value)}
          className="flex-1"
        />
      </div>
    </div>
  )
}