'use client'

import { useState, useEffect } from 'react'
import { useRealtimeContext, useRealtimeEventContext } from '@/contexts/RealtimeContext'

export default function DiagnosticsPage() {
  const { connectionState, isConnected } = useRealtimeContext()
  const [events, setEvents] = useState<any[]>([])
  const [debugResults, setDebugResults] = useState<any>(null)
  
  // Listen for all relevant events
  useRealtimeEventContext('log_message', (data) => {
    console.log('[Diagnostics] log_message:', data)
    setEvents(prev => [...prev, { type: 'log_message', data, time: new Date().toISOString() }])
  })
  
  useRealtimeEventContext('ai_log_message', (data) => {
    console.log('[Diagnostics] ai_log_message:', data)
    setEvents(prev => [...prev, { type: 'ai_log_message', data, time: new Date().toISOString() }])
  })
  
  useRealtimeEventContext('new_alert', (data) => {
    console.log('[Diagnostics] new_alert:', data)
    setEvents(prev => [...prev, { type: 'new_alert', data, time: new Date().toISOString() }])
  })
  
  useRealtimeEventContext('alert', (data) => {
    console.log('[Diagnostics] alert:', data)
    setEvents(prev => [...prev, { type: 'alert', data, time: new Date().toISOString() }])
  })
  
  const runDebugTest = async () => {
    try {
      const res = await fetch('/api/debug/events')
      const result = await res.json()
      setDebugResults(result)
    } catch (error) {
      console.error('Debug test failed:', error)
      setDebugResults({ error: error.message })
    }
  }
  
  const runTickerTest = async () => {
    try {
      // Login first
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'navhunter123' })
      })
      
      if (!loginRes.ok) {
        throw new Error('Login failed')
      }
      
      // Run ticker test with full config
      const tickerRes = await fetch('/api/sec/test-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: 'MSTR',
          config: {
            formTypes: ['8-K'],
            confidence: 65,
            aiModel: 'gpt-4o-mini',
            aiTemperature: 0.1,
            aiPrompt: `You are an expert financial analyst AI. Your task is to analyze SEC filings for crypto treasury events.

COMPANY: {company} ({ticker})
FORM TYPE: {formType}

Analyze the filing to determine if it contains information about Bitcoin or cryptocurrency purchases. Your response MUST be valid JSON.

Set isAlertWorthy to true ONLY if the filing mentions Bitcoin, cryptocurrency, or digital asset purchases.

Example response for a Bitcoin purchase:
{
  "isAlertWorthy": true,
  "confidenceScore": 95,
  "alertHighlight": true,
  "textToSpeak": "Alert on ticker M S T R. Bitcoin purchase detected.",
  "analysis": "Company purchased Bitcoin for treasury"
}`
          }
        })
      })
      
      const result = await tickerRes.json()
      setDebugResults(result)
    } catch (error) {
      console.error('Ticker test failed:', error)
      setDebugResults({ error: error.message })
    }
  }
  
  const clearEvents = () => {
    setEvents([])
  }
  
  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h1>Nav-Hunter Diagnostics</h1>
      
      <div style={{ marginBottom: 20, padding: 10, border: '1px solid #ccc', borderRadius: 5 }}>
        <h2>Connection Status</h2>
        <p>Realtime Connected: {isConnected ? '✅ YES' : '❌ NO'}</p>
        <p>Connection State: {connectionState.status}</p>
        <p>Retry Count: {connectionState.retryCount}</p>
      </div>
      
      <div style={{ marginBottom: 20 }}>
        <button onClick={runDebugTest} style={{ marginRight: 10 }}>
          Send Debug Events
        </button>
        <button onClick={runTickerTest} style={{ marginRight: 10 }}>
          Run MSTR Ticker Test
        </button>
        <button onClick={clearEvents}>
          Clear Events
        </button>
      </div>
      
      {debugResults && (
        <div style={{ marginBottom: 20, padding: 10, border: '1px solid #0f0', borderRadius: 5 }}>
          <h3>Debug Results</h3>
          <pre>{JSON.stringify(debugResults, null, 2)}</pre>
        </div>
      )}
      
      <div style={{ marginBottom: 20, padding: 10, border: '1px solid #00f', borderRadius: 5 }}>
        <h2>Received Events ({events.length})</h2>
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {events.map((event, i) => (
            <div key={i} style={{ 
              marginBottom: 10, 
              padding: 5, 
              border: '1px solid #ddd',
              backgroundColor: event.type === 'ai_log_message' ? '#e6f3ff' : '#f0f0f0'
            }}>
              <strong>{event.type}</strong> - {event.time}
              <pre style={{ margin: 5, fontSize: 12 }}>{JSON.stringify(event.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}