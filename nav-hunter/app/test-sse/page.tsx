'use client'

import { useState, useEffect } from 'react'

export default function TestSSE() {
  const [events, setEvents] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  
  useEffect(() => {
    const eventSource = new EventSource('/api/realtime')
    
    eventSource.onopen = () => {
      console.log('SSE Connected')
      setConnected(true)
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE Error:', error)
      setConnected(false)
    }
    
    eventSource.onmessage = (event) => {
      console.log('SSE Message:', event)
      try {
        const data = JSON.parse(event.data)
        setEvents(prev => [...prev, { type: 'message', data, time: new Date().toISOString() }])
      } catch (e) {
        console.error('Failed to parse SSE message:', e)
      }
    }
    
    // Listen for specific event types
    const eventTypes = ['ai_log_message', 'log_message', 'new_alert', 'alert']
    
    eventTypes.forEach(eventType => {
      eventSource.addEventListener(eventType, (event: any) => {
        console.log(`SSE Event [${eventType}]:`, event.data)
        try {
          const data = JSON.parse(event.data)
          setEvents(prev => [...prev, { type: eventType, data, time: new Date().toISOString() }])
        } catch (e) {
          console.error(`Failed to parse ${eventType}:`, e)
        }
      })
    })
    
    return () => {
      eventSource.close()
    }
  }, [])
  
  const runTest = async () => {
    const res = await fetch('/api/test-broadcast')
    const result = await res.json()
    console.log('Test result:', result)
  }
  
  return (
    <div style={{ padding: 20 }}>
      <h1>SSE Test Page</h1>
      <p>Connection: {connected ? '✅ Connected' : '❌ Disconnected'}</p>
      <button onClick={runTest}>Send Test Broadcast</button>
      
      <h2>Events ({events.length})</h2>
      <div style={{ maxHeight: 400, overflow: 'auto', border: '1px solid #ccc', padding: 10 }}>
        {events.map((event, i) => (
          <div key={i} style={{ marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 10 }}>
            <strong>{event.type}</strong> - {event.time}
            <pre>{JSON.stringify(event.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  )
}