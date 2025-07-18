'use client';

import { useState } from 'react';

interface SimpleAlertCardProps {
  id: string;
  ticker: string;
  company: string;
  formType: string;
  filedAt: string;
  confidenceScore: number;
  isGoldAlert: boolean;
  analysis?: {
    summary?: string;
    keyPoints?: string[];
    recommendation?: string;
  };
  linkToFiling?: string;
  processingDelay?: number;
}

export function SimpleAlertCard({
  ticker,
  company,
  formType,
  filedAt,
  confidenceScore,
  isGoldAlert,
  analysis,
  linkToFiling,
  processingDelay
}: SimpleAlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 border-l-4 transition-all ${
        isGoldAlert 
          ? 'border-amber-500 shadow-amber-500/20 shadow-lg' 
          : 'border-blue-500'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">
              {company} ({ticker})
            </h3>
            {isGoldAlert && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-medium">
                GOLD ALERT
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {formType} • {new Date(filedAt).toLocaleString()}
            {processingDelay && (
              <span className="ml-2 text-gray-500">
                (Processed in {processingDelay}s)
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${
            confidenceScore >= 80 ? 'text-green-400' : 
            confidenceScore >= 60 ? 'text-yellow-400' : 'text-gray-400'
          }`}>
            {confidenceScore}% confidence
          </div>
        </div>
      </div>
      
      {analysis?.summary && (
        <p className="text-gray-300 text-sm mb-3">{analysis.summary}</p>
      )}

      {analysis?.keyPoints && analysis.keyPoints.length > 0 && (
        <div className={`${isExpanded ? 'block' : 'hidden'} mb-3`}>
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Key Points:</p>
          <ul className="space-y-1">
            {analysis.keyPoints.map((point, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis?.recommendation && isExpanded && (
        <div className="mb-3 p-3 bg-gray-700/50 rounded">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Recommendation:</p>
          <p className="text-sm text-gray-300">{analysis.recommendation}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
        <div className="flex gap-3">
          {linkToFiling && (
            <a
              href={linkToFiling}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View Filing →
            </a>
          )}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${ticker}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            TradingView →
          </a>
        </div>
        
        {(analysis?.keyPoints || analysis?.recommendation) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        )}
      </div>
    </div>
  );
}