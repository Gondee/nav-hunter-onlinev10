'use client';

import { useState, useEffect } from 'react';

interface SimpleConfigPanelProps {
  onConfigChange?: (config: ConfigData) => void;
}

interface ConfigData {
  formTypes: string[];
  confidenceThreshold: number;
  aiPrompt: string;
}

const DEFAULT_PROMPT = `You are a financial analyst. Analyze this SEC filing and determine if it contains market-moving information. Consider:
- Major strategic changes
- Significant financial events
- Leadership changes
- M&A activity
- Regulatory issues

Respond with analysis including summary, key points, and recommendation.`;

export function SimpleConfigPanel({ onConfigChange }: SimpleConfigPanelProps) {
  const [formTypes, setFormTypes] = useState<string[]>(['8-K', '10-Q', '10-K']);
  const [confidenceThreshold, setConfidenceThreshold] = useState(65);
  const [aiPrompt, setAiPrompt] = useState(DEFAULT_PROMPT);
  const [isExpanded, setIsExpanded] = useState(false);
  const [testTicker, setTestTicker] = useState('');
  const [isTestingTicker, setIsTestingTicker] = useState(false);

  const availableFormTypes = [
    { value: '8-K', label: '8-K (Current Report)' },
    { value: '10-Q', label: '10-Q (Quarterly Report)' },
    { value: '10-K', label: '10-K (Annual Report)' },
    { value: '6-K', label: '6-K (Foreign Private Issuer)' },
    { value: '20-F', label: '20-F (Foreign Annual Report)' },
    { value: 'S-1', label: 'S-1 (IPO Registration)' },
    { value: 'DEF 14A', label: 'DEF 14A (Proxy Statement)' }
  ];

  useEffect(() => {
    // Load saved config from localStorage
    const saved = localStorage.getItem('nav-hunter-config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setFormTypes(config.formTypes || ['8-K', '10-Q', '10-K']);
        setConfidenceThreshold(config.confidenceThreshold || 65);
        setAiPrompt(config.aiPrompt || DEFAULT_PROMPT);
      } catch (e) {
        console.error('Failed to load config:', e);
      }
    }
  }, []);

  const saveConfig = () => {
    const config = { formTypes, confidenceThreshold, aiPrompt };
    localStorage.setItem('nav-hunter-config', JSON.stringify(config));
    onConfigChange?.(config);
  };

  const handleFormTypeToggle = (formType: string) => {
    setFormTypes(prev => 
      prev.includes(formType) 
        ? prev.filter(f => f !== formType)
        : [...prev, formType]
    );
  };

  const handleTestTicker = async () => {
    if (!testTicker.trim()) return;
    
    setIsTestingTicker(true);
    try {
      const response = await fetch('/api/sec/test-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ticker: testTicker.toUpperCase(),
          config: { formTypes, confidenceThreshold, aiPrompt }
        })
      });
      
      if (!response.ok) {
        throw new Error('Test failed');
      }
      
      const result = await response.json();
      console.log('Test ticker result:', result);
    } catch (error) {
      console.error('Test ticker error:', error);
    } finally {
      setIsTestingTicker(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Configuration</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      <div className={`space-y-4 ${isExpanded ? 'block' : 'hidden'}`}>
        {/* Form Types */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Form Types to Monitor
          </label>
          <div className="space-y-2">
            {availableFormTypes.map(({ value, label }) => (
              <label key={value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formTypes.includes(value)}
                  onChange={() => handleFormTypeToggle(value)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Confidence Threshold */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Alert Confidence Threshold: {confidenceThreshold}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0% (All)</span>
            <span>50%</span>
            <span>100% (Strict)</span>
          </div>
        </div>

        {/* AI Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            AI Analysis Prompt
          </label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
            placeholder="Enter your custom AI prompt..."
          />
          <button
            onClick={() => setAiPrompt(DEFAULT_PROMPT)}
            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            Reset to default
          </button>
        </div>

        {/* Test Ticker */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Test Specific Ticker
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testTicker}
              onChange={(e) => setTestTicker(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleTestTicker()}
              placeholder="Enter ticker (e.g., AAPL)"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 uppercase placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleTestTicker}
              disabled={isTestingTicker || !testTicker.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isTestingTicker ? 'Testing...' : 'Test'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fetches latest filing for this ticker and runs AI analysis
          </p>
        </div>

        {/* Save Button */}
        <button
          onClick={saveConfig}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Save Configuration
        </button>
      </div>

      {/* Collapsed Summary */}
      {!isExpanded && (
        <div className="text-sm text-gray-400">
          Monitoring {formTypes.length} form types • {confidenceThreshold}% threshold
        </div>
      )}
    </div>
  );
}