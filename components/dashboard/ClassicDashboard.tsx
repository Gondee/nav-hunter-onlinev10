'use client';

import { useState, useEffect, useRef } from 'react';
import { useRealtimeContext, useRealtimeEventContext } from '@/contexts/RealtimeContext';
import { SecAPI } from '@/lib/services/sec-api';
import './classic-dashboard.css';

interface ClassicDashboardProps {
  audioEnabled: boolean;
  onLogout?: () => void;
}

const defaultPrompt = `You are an expert financial analyst AI. Your task is to analyze SEC filings for specific, user-defined events.

COMPANY: {company} ({ticker})
FORM TYPE: {formType}

First, analyze the filing to determine if it contains any relevant information according to the user's criteria. Your response MUST be a clean JSON object without any markdown.

**Primary Decision:**
- **isAlertWorthy** (boolean): This is the most important field.
    - Set to **true** ONLY if the filing contains a significant, actionable event that matches the user's criteria.
    - Set to **false** if the filing is routine, irrelevant, or does not contain any event of interest. **If this is false, no alert will be generated.**

**If and ONLY If isAlertWorthy is true, provide the following:**
1.  **isAlertWorthy** (boolean): Set to true ONLY if the filing contains information about crypto currencies or digital assets being added to the company's treasury, or if it is an initial pivot to a new strategy involving crypto assets. This should be a significant event that warrants immediate attention.
   - For example, if a company announces it is adopting Bitcoin as its primary treasury reserve asset, this should be marked as worthy of an alert.
   - If the filing is a routine update without significant changes to crypto holdings or strategy, set this to false.
2.  **confidenceScore** (integer, 0-100): Your confidence level in your understanding of setting the isAlertWorthy field. This should reflect how certain you are that the filing meets the criteria for an alert.
   - For example, if you are very confident that the filing is significant, set this to 90 or above. If you are unsure, set it lower.
   - If you set isAlertWorthy to true, confidenceScore should be at least 80.
3.  **alertHighlight** (boolean): Set to true if this is indeed an initial pivot to a new strategy involving crypto assets as treasury assets for the company, such as Bitcoin or Ethereum. This should be used to highlight the most significant changes in strategy.
   - For example, if a company is pivoting to focus on Bitcoin as its primary treasury asset, set this to true. Meaning the first time they are doing this.
   - If the filing is a routine update or does not represent a significant change, set this to false. If the update does not explictly mention a pivot to the purchase of crypto assets on the balance sheet, set this to false.
4.  **textToSpeak** (string): A concise, spoken-word summary of the alert for audio notification with ticket and relevant quote. Example: "Alert for M S T R. Initial strategy pivot. Quote: MicroStrategy has purchased an additional 12,000 bitcoins."
5. **isChinese** (boolean): Set to true if the filing is from a Chinese company, false otherwise. This is important for filtering out filings from companies that may not be relevant to the user's focus on US-based crypto treasury pivots.
6. **investors** (string): let me know the few key investors involved in this event
7. **RaiseOrAnnouncment** (String): If this is a actual raise or announcement (meaning the money is confirmed raised, not an announcment to raise), Then Say yes and give proof, otherwise Say No. This is important to distinguish between routine updates and significant events.


**A complete example response for an initial pivot:**
{
  "isAlertWorthy": true,
  "confidenceScore": 98,
  "alertHighlight": true,
  "isChinese": false,
  "investors": "Michael Saylor, Pantera Capital",
  "raiseOrAnnouncment": "Yes, this is actual funds raised based on Quote of 1 sentence"
  "textToSpeak": "Alert on ticker M S T R. Form 8-K. Initial strategy pivot. Quote: MicroStrategy adopts Bitcoin as its primary treasury reserve asset. Let me know if chinese",
  "Event Type": "Crypto Treasury Pivot",
  "Asset": "Bitcoin (BTC)",
  "Key Quote": "The board of directors has approved a new treasury reserve policy that makes bitcoin the company's primary treasury reserve asset."

**Example of an Irrelevant Filing (No Alert):**
{
  "isAlertWorthy": false
}`;

export function ClassicDashboard({ audioEnabled, onLogout }: ClassicDashboardProps) {
  const { connectionState } = useRealtimeContext();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [wsFlashTimeout, setWsFlashTimeout] = useState<NodeJS.Timeout | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Form state
  const [confidence, setConfidence] = useState(65);
  const [formTypes, setFormTypes] = useState({
    '8-K': true,
    '10-Q': true,
    '10-K': true,
    'S-1': false,
    '424B4': false,
    'N-CSR': false,
    'N-PORT': false,
    '497': false
  });
  const [testTicker, setTestTicker] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o-mini');
  const [aiTemperature, setAiTemperature] = useState(0.1);
  const [aiPrompt, setAiPrompt] = useState(defaultPrompt);
  
  // Initialize API keys from .env.local
  useEffect(() => {
    // The keys are loaded from environment variables on the server side
    // We'll keep them empty on client side for security
  }, []);
  
  // Refs
  const consoleRef = useRef<HTMLDivElement>(null);
  const aiLogRef = useRef<HTMLDivElement>(null);
  const wsStatusRef = useRef<HTMLDivElement>(null);
  
  // Log functions
  const log = (message: string, level: string = 'info') => {
    const el = consoleRef.current;
    if (!el) return;
    
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    el.appendChild(entry);
    el.scrollTop = el.scrollHeight;
    
    if (el.children.length > 200) {
      el.removeChild(el.firstChild!);
    }
  };
  
  const aiLog = (message: string, level: string = 'info', details: any = null) => {
    console.log('[AI Log] Adding to terminal:', message, 'level:', level);
    const el = aiLogRef.current;
    if (!el) {
      console.error('[AI Log] aiLogRef.current is null!');
      return;
    }
    
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    
    let color = 'var(--text-main)';
    if (level === 'analysis') color = 'var(--accent-blue)';
    if (level === 'hit') color = 'var(--accent-amber)';
    if (level === 'error') color = 'var(--accent-red)';
    
    entry.style.color = color;
    entry.style.margin = '2px 0';
    
    if (details) {
      entry.innerHTML = `[${time}] ${message} <span style="cursor: pointer; text-decoration: underline; color: var(--text-muted);">(Details)</span>`;
      entry.onclick = () => showLogDetailsModal(details);
    } else {
      entry.innerHTML = `[${time}] ${message}`;
    }
    
    el.appendChild(entry);
    el.scrollTop = el.scrollHeight;
    
    if (el.children.length > 100) {
      el.removeChild(el.children[1]);
    }
  };
  
  const showLogDetailsModal = (details: any) => {
    const modal = document.getElementById('log-details-modal-overlay');
    const requestContent = document.getElementById('modal-request-content');
    const responseContent = document.getElementById('modal-response-content');
    
    if (modal && requestContent && responseContent) {
      requestContent.textContent = details.request;
      responseContent.textContent = details.response;
      modal.style.display = 'flex';
    }
  };
  
  const hideLogDetailsModal = () => {
    const modal = document.getElementById('log-details-modal-overlay');
    if (modal) {
      modal.style.display = 'none';
    }
  };
  
  // Listen for real-time events
  useRealtimeEventContext('filing', (data: any) => {
    setProcessedCount(prev => prev + 1);
    flashWsStatus();
  });
  
  useRealtimeEventContext('alert', (data: any) => {
    handleNewAlert(data);
  });
  
  useRealtimeEventContext('new_alert', (data: any) => {
    handleNewAlert(data);
  });
  
  useRealtimeEventContext('status', (data: any) => {
    const wsStatus = wsStatusRef.current;
    if (!wsStatus) return;
    
    if (data.status === 'connected') {
      wsStatus.textContent = 'Live';
      wsStatus.style.color = 'var(--accent-green)';
      document.getElementById('status')!.textContent = 'Status: Connected - Streaming live filings';
    } else if (data.status === 'disconnected') {
      wsStatus.textContent = 'Off';
      wsStatus.style.color = 'var(--text-muted)';
    }
  });
  
  useRealtimeEventContext('log_message', (data: any) => {
    log(data.message, data.level);
  });
  
  useRealtimeEventContext('ai_log_message', (data: any) => {
    console.log('[Dashboard] AI log message received:', data);
    aiLog(data.message, data.level || 'info', data.details);
  });
  
  useRealtimeEventContext('test_ticker_finished', () => {
    const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
    if (testBtn) {
      testBtn.disabled = isMonitoring;
      testBtn.textContent = 'Test Ticker';
    }
  });
  
  useRealtimeEventContext('replay_finished', () => {
    log('⟳ Replay complete.', 'warn');
    const buttons = ['startBtn', 'stopBtn', 'replayBtn', 'testBtn', 'shutdownBtn', 'notifyBtn'];
    buttons.forEach(id => {
      const btn = document.getElementById(id) as HTMLButtonElement;
      if (btn) {
        if (id === 'startBtn') btn.disabled = false;
        else if (id === 'stopBtn') btn.disabled = true;
        else (btn as HTMLButtonElement).disabled = false;
      }
    });
  });
  
  useRealtimeEventContext('update_stats', (data: any) => {
    if (data.processed) {
      setProcessedCount(prev => prev + data.processed);
    }
    if (data.alerts) {
      setAlertCount(prev => prev + data.alerts);
    }
  });
  
  useRealtimeEventContext('play_tts_audio', (data: any) => {
    playTTSAudio(data.audioB64);
  });
  
  useRealtimeEventContext('server_shutting_down', (data: any) => {
    log(data.message, 'warn');
    document.getElementById('status')!.textContent = 'Status: Server has been shut down.';
    document.body.style.backgroundColor = 'var(--accent-red)';
  });
  
  useRealtimeEventContext('monitoring_status', (data: any) => {
    setIsMonitoring(data.isMonitoring);
    if (data.isMonitoring) {
      setStartTime(Date.now());
      document.getElementById('status')!.textContent = 'Status: Connecting...';
    } else {
      setStartTime(null);
      document.getElementById('status')!.textContent = 'Status: Stopped';
      const wsStatus = wsStatusRef.current;
      if (wsStatus) {
        wsStatus.textContent = 'Off';
        wsStatus.style.color = 'var(--text-muted)';
      }
      log('⏹ Monitoring stopped', 'info');
    }
  });
  
  const flashWsStatus = () => {
    const wsStatus = wsStatusRef.current;
    if (!wsStatus || !isMonitoring) return;
    
    if (wsFlashTimeout) clearTimeout(wsFlashTimeout);
    
    wsStatus.style.color = 'var(--text-main)';
    wsStatus.textContent = 'Receiving';
    
    const timeout = setTimeout(() => {
      if (isMonitoring && wsStatus) {
        const currentStatus = wsStatus.textContent;
        if (currentStatus !== 'Error' && currentStatus !== 'Off') {
          wsStatus.style.color = 'var(--accent-green)';
          wsStatus.textContent = 'Live';
        }
      }
    }, 300);
    
    setWsFlashTimeout(timeout);
  };
  
  const handleNewAlert = (data: any) => {
    const { filing, aiAnalysis } = data;
    setAlertCount(prev => prev + 1);
    
    const alertTime = new Date();
    const filedAtTime = new Date(filing.filedAt);
    let delayString = 'N/A';
    
    if (!isNaN(filedAtTime.getTime())) {
      const delayMs = alertTime.getTime() - filedAtTime.getTime();
      const totalSeconds = delayMs / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toFixed(1);
      delayString = `${minutes} min, ${seconds} sec`;
    }
    
    const formattedFiledAt = filedAtTime.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // Handle both event structures: new_alert has alertLevel, alert has level
    const alertLevel = data.alertLevel || data.level;
    const isGoldAlert = alertLevel === 'gold' || aiAnalysis.alertHighlight;
    
    console.log('[Dashboard] Alert level detection:', { 
      alertLevel, 
      dataLevel: data.level, 
      dataAlertLevel: data.alertLevel,
      alertHighlight: aiAnalysis.alertHighlight,
      isGoldAlert 
    });
    
    const newAlert = {
      filing,
      aiAnalysis,
      delayString,
      formattedFiledAt,
      isGoldAlert: isGoldAlert
    };
    
    setAlerts(prev => [newAlert, ...prev]);
    
    if (newAlert.isGoldAlert) {
      log(`🔊 GOLD ALERT: ${filing.ticker} - Awaiting audio...`, 'warn');
    } else {
      playPing();
      log(`🔊 BLUE ALERT: ${filing.ticker}`, 'info');
    }
    
    // Browser notification
    if (notificationsEnabled && Notification.permission === 'granted') {
      const notifTitle = `${newAlert.isGoldAlert ? 'GOLD' : 'Blue'} Alert: ${filing.ticker || 'N/A'}`;
      const notifBody = aiAnalysis.textToSpeak || `Confidence: ${aiAnalysis.confidenceScore}%`;
      new Notification(notifTitle, {
        body: notifBody,
        icon: 'https://www.google.com/s2/favicons?domain=sec.gov&sz=64'
      });
    }
  };
  
  const playPing = () => {
    if (audioEnabled) {
      const pingPlayer = document.getElementById('ping-sound') as HTMLAudioElement;
      if (pingPlayer) {
        pingPlayer.currentTime = 0;
        pingPlayer.play().catch(e => console.error("Error playing ping sound:", e));
      }
    }
  };
  
  const playTTSAudio = (audioB64: string) => {
    if (audioEnabled && audioB64) {
      const audioPlayer = document.getElementById('tts-audio') as HTMLAudioElement;
      if (audioPlayer) {
        audioPlayer.src = `data:audio/mp3;base64,${audioB64}`;
        audioPlayer.play().catch(error => console.error("Error playing TTS audio:", error));
      }
    }
  };
  
  const getSelectedFormTypes = () => {
    return Object.entries(formTypes)
      .filter(([_, checked]) => checked)
      .map(([type, _]) => type);
  };
  
  const startMonitoring = async () => {
    try {
      const config = {
        formTypes: getSelectedFormTypes(),
        confidence,
        aiModel,
        aiTemperature,
        aiPrompt,
        // API keys are managed server-side only
      };
      
      await SecAPI.startMonitoring(config);
      setIsMonitoring(true);
      setStartTime(Date.now());
      log('▶ Starting real-time detection...', 'info');
    } catch (error) {
      log('❌ Failed to start monitoring', 'error');
    }
  };
  
  const stopMonitoring = async () => {
    try {
      await SecAPI.stopMonitoring();
      setIsMonitoring(false);
      setStartTime(null);
      log('⏹ Monitoring stopped', 'info');
    } catch (error) {
      log('❌ Failed to stop monitoring', 'error');
    }
  };
  
  const runTickerTest = async () => {
    const ticker = testTicker.trim().toUpperCase();
    if (!ticker) {
      log('❌ Please enter a ticker to test.', 'error');
      return;
    }
    
    const testBtn = document.getElementById('testBtn') as HTMLButtonElement;
    if (testBtn) {
      testBtn.disabled = true;
      testBtn.textContent = 'Testing...';
    }
    
    try {
      const config = {
        formTypes: getSelectedFormTypes(),
        confidence,
        aiModel,
        aiTemperature,
        aiPrompt,
        // API keys are managed server-side only
      };
      
      const result = await SecAPI.testTicker(ticker, config);
      
      if (result.success) {
        log(`✅ ${result.message}`, 'info');
      } else {
        log(`⚠️ ${result.message}`, 'warn');
      }
    } catch (error: any) {
      log(`❌ Test failed: ${error.message}`, 'error');
    } finally {
      if (testBtn) {
        testBtn.disabled = isMonitoring;
        testBtn.textContent = 'Test Ticker';
      }
    }
  };
  
  const replayLogFile = async () => {
    log('⟳ Starting replay from websocket_stream.log...', 'warn');
    
    // Disable buttons
    const buttons = ['startBtn', 'stopBtn', 'replayBtn', 'testBtn', 'shutdownBtn', 'notifyBtn'];
    buttons.forEach(id => {
      const btn = document.getElementById(id) as HTMLButtonElement;
      if (btn) btn.disabled = true;
    });
    
    setStartTime(Date.now());
    setProcessedCount(0);
    setAlertCount(0);
    
    try {
      const config = {
        formTypes: getSelectedFormTypes(),
        confidence,
        aiModel,
        aiTemperature,
        aiPrompt,
        // API keys are managed server-side only
      };
      
      const result = await SecAPI.replayLogFile(config);
      
      if (result.success) {
        log(`✅ Replay complete. Processed ${result.processed}/${result.total} entries.`, 'info');
      }
    } catch (error: any) {
      log(`❌ Replay failed: ${error.message}`, 'error');
      // Re-enable buttons on error
      buttons.forEach(id => {
        const btn = document.getElementById(id) as HTMLButtonElement;
        if (btn) {
          if (id === 'startBtn') btn.disabled = isMonitoring;
          else if (id === 'stopBtn') btn.disabled = !isMonitoring;
          else btn.disabled = isMonitoring;
        }
      });
    }
  };
  
  const clearAlerts = () => {
    setAlerts([]);
    setAlertCount(0);
    log('Alerts cleared.', 'info');
  };
  
  
  const broadcastMessage = (message: any) => {
    // Broadcast a message through the event bus
    fetch('/api/sec/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    }).catch(console.error);
  };
  
  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      log('This browser does not support desktop notifications.', 'error');
      return;
    }
    
    if (Notification.permission === 'granted') {
      log('Browser notifications are already enabled.', 'info');
      setNotificationsEnabled(true);
      return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationsEnabled(true);
      log('Browser notifications enabled successfully.', 'info');
      new Notification("NAVHunter", { body: "Notifications are now enabled!" });
    } else {
      setNotificationsEnabled(false);
      log('Browser notifications were denied.', 'warn');
    }
  };
  
  // Update stats
  useEffect(() => {
    const interval = setInterval(() => {
      if ((isMonitoring || (document.getElementById('replayBtn') as HTMLButtonElement)?.disabled) && startTime) {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        const uptime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl) uptimeEl.textContent = uptime;
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMonitoring, startTime]);
  
  // Initialize
  useEffect(() => {
    log('System initialized. Click page to enable audio.', 'info');
    aiLog('[READY] ChatGPT-4o-mini configured.', 'info');
    aiLog('Waiting for filings to analyze...', 'info');
  }, []);
  
  return (
    <>
      <div className="side-panel ai-terminal" id="aiTerminal">
        <h3 style={{color: 'var(--accent-blue)', marginTop: 0}}>🤖 AI Analysis Terminal</h3>
        <div id="aiLog" ref={aiLogRef}>
          {/* Initial content will be added by useEffect */}
        </div>
      </div>
      
      <div className="main-content">
        <div className="container">
          <h1>NAVHunter v10</h1>
          
          <div className="panel">
            <h3>Crypto Treasury Alerts</h3>
            <div id="alertsContainer">
              {alerts.length === 0 ? (
                'No alerts yet'
              ) : (
                alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={alert.isGoldAlert ? 'alert alert-initial' : 'alert'}
                  >
                    <div className="alert-header">
                      {alert.isGoldAlert && <span style={{color: '#FFD700', marginRight: '8px'}}>🥇 GOLD</span>}
                      {!alert.isGoldAlert && <span style={{color: '#4A90E2', marginRight: '8px'}}>🔵 BLUE</span>}
                      {alert.filing.companyName || 'Unknown'} ({alert.filing.ticker || 'N/A'}) - {alert.aiAnalysis.confidenceScore}%
                      <span className="alert-delay">(Delay: {alert.delayString})</span>
                    </div>
                    <div className="alert-details">
                      {Object.entries(alert.aiAnalysis)
                        .filter(([key]) => !['isAlertWorthy', 'confidenceScore', 'alertHighlight', 'textToSpeak'].includes(key))
                        .map(([key, value]) => (
                          <div key={key}>
                            <strong>{key}:</strong> {String(value)}<br/>
                          </div>
                        ))}
                      <strong>Filing:</strong> {alert.filing.formType} &nbsp;&nbsp;
                      <strong>Filed At:</strong> {alert.formattedFiledAt}<br/>
                    </div>
                    <div className="alert-links">
                      <a href={`https://www.tradingview.com/chart/?symbol=${alert.filing.ticker}`} target="_blank" rel="noopener noreferrer">
                        💹 TradingView
                      </a>
                      <a href={alert.filing.linkToFilingDetails || alert.filing.linkToHtml} target="_blank" rel="noopener noreferrer">
                        📄 SEC Filing
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="panel">
            <h3>Configuration</h3>
            <div className="button-group">
              <button className="btn" onClick={startMonitoring} id="startBtn" disabled={isMonitoring}>
                ▶ Start Real Time Detection
              </button>
              <button className="btn" onClick={stopMonitoring} id="stopBtn" disabled={!isMonitoring}>
                ■ Stop
              </button>
              <button className="btn" onClick={replayLogFile} id="replayBtn" style={{backgroundColor: 'var(--accent-purple)'}} disabled={isMonitoring || false}>
                ⟳ Replay Log File
              </button>
              <button className="btn" onClick={clearAlerts} style={{backgroundColor: '#555'}}>
                Clear Alerts
              </button>
              <button className="btn" onClick={requestNotificationPermission} id="notifyBtn" style={{backgroundColor: 'var(--accent-green)'}} disabled={isMonitoring}>
                Enable Notifications
              </button>
            </div>
            
            <div className="form-row">
              <label>Confidence:</label>
              <input
                type="number"
                id="confidence"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                min="0"
                max="100"
                style={{width: '60px', flex: 0}}
                suppressHydrationWarning
              />
            </div>
            
            <div className="form-row form-row-column">
              <label style={{marginBottom: '10px'}}>Form Types:</label>
              <div className="checkbox-group">
                {Object.entries(formTypes).map(([type, checked]) => (
                  <label key={type} title={getFormTypeTitle(type)}>
                    <input
                      type="checkbox"
                      name="formType"
                      value={type}
                      checked={checked}
                      onChange={(e) => setFormTypes(prev => ({...prev, [type]: e.target.checked}))}
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
            
            <hr style={{borderColor: 'var(--border-color)', margin: '15px 0'}} />
            
            <div className="form-row">
              <label>Test Ticker:</label>
              <input
                type="text"
                id="testTickerInput"
                placeholder="e.g., MSTR"
                value={testTicker}
                onChange={(e) => setTestTicker(e.target.value)}
                style={{textTransform: 'uppercase'}}
                suppressHydrationWarning
              />
              <button className="btn" onClick={runTickerTest} id="testBtn" disabled={isMonitoring}>
                Test Ticker
              </button>
            </div>
            
            <hr style={{borderColor: 'var(--border-color)', margin: '20px 0 10px'}} />
            
          </div>
          
          <div className="panel">
            <h3>🤖 AI Prompt & Tuning</h3>
            <div className="form-row">
              <label>Model:</label>
              <input
                type="text"
                id="aiModel"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                style={{flexGrow: 1}}
                suppressHydrationWarning
              />
              <label style={{width: 'auto', marginLeft: '10px'}}>Temp:</label>
              <input
                type="number"
                id="aiTemperature"
                value={aiTemperature}
                onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                min="0"
                max="2"
                step="0.1"
                style={{width: '60px', flex: 0}}
                suppressHydrationWarning
              />
            </div>
            
            <div className="form-row" style={{flexDirection: 'column', alignItems: 'stretch'}}>
              <label style={{marginBottom: '5px'}}>AI System Prompt:</label>
              <textarea
                id="aiPromptTextarea"
                rows={15}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                style={{width: '100%', boxSizing: 'border-box'}}
              />
            </div>
            
            <button
              className="btn"
              onClick={() => {
                setAiPrompt(defaultPrompt);
                log('AI prompt restored to default.', 'info');
              }}
              style={{backgroundColor: '#555'}}
            >
              Restore Default Prompt
            </button>
          </div>
          
          <div className="status" id="status">
            Status: {isMonitoring ? 'Connecting...' : 'Stopped'}
          </div>
          
          <div className="panel">
            <div className="stats">
              <div className="stat">
                <div className="stat-num" id="processed">{processedCount}</div>
                <div className="stat-label">Processed</div>
              </div>
              <div className="stat">
                <div className="stat-num" id="alerts">{alertCount}</div>
                <div className="stat-label">Alerts</div>
              </div>
              <div className="stat">
                <div className="stat-num" id="uptime">00:00</div>
                <div className="stat-label">Uptime</div>
              </div>
              <div className="stat">
                <div
                  className="stat-num"
                  id="wsStatus"
                  ref={wsStatusRef}
                  style={{color: 'var(--text-muted)'}}
                >
                  Off
                </div>
                <div className="stat-label">Connection</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="console" id="console" ref={consoleRef}>
        <div className="log-entry log-info">System initialized. Click page to enable audio.</div>
      </div>
      
      <div id="log-details-modal-overlay" onClick={(e) => {
        if ((e.target as HTMLElement).id === 'log-details-modal-overlay') {
          hideLogDetailsModal();
        }
      }}>
        <div id="log-details-modal">
          <span id="modal-close-btn" onClick={hideLogDetailsModal}>&times;</span>
          <div id="modal-content-wrapper">
            <div className="modal-section">
              <h4>Request Sent to AI</h4>
              <pre id="modal-request-content"></pre>
            </div>
            <div className="modal-section">
              <h4>Raw Response from AI</h4>
              <pre id="modal-response-content"></pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function getFormTypeTitle(formType: string): string {
  const titles: Record<string, string> = {
    '8-K': 'Standard corporate report of material events',
    '10-Q': 'Quarterly corporate report',
    '10-K': 'Annual corporate report',
    'S-1': 'IPO registration statement',
    '424B4': 'Prospectus for offerings',
    'N-CSR': 'Annual/Semi-annual fund report',
    'N-PORT': 'Monthly fund portfolio holdings',
    '497': 'Fund prospectus supplement'
  };
  return titles[formType] || '';
}