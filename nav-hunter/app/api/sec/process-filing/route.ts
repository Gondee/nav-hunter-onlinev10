import { NextRequest } from 'next/server';
import { broadcast, broadcastLog, broadcastAILog, broadcastNewAlert, broadcastStats, broadcastTTS } from '@/lib/realtime/server';

console.log('[Process Filing] Module loaded at:', new Date().toISOString());

async function fetchAndStripHtml(url: string): Promise<string> {
  try {
    if (!url) {
      console.log('[fetchAndStripHtml] No URL provided');
      return '';
    }
    
    console.log('[fetchAndStripHtml] Fetching URL:', url);
    broadcastLog(`📥 Fetching document from SEC...`, 'info');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'NAVHunter myemail@example.com'
      }
    });
    
    console.log('[fetchAndStripHtml] Response status:', response.status);
    
    if (!response.ok) {
      console.error(`[fetchAndStripHtml] Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      broadcastLog(`❌ Failed to fetch document: ${response.status} ${response.statusText}`, 'error');
      return '';
    }
    
    const html = await response.text();
    console.log(`[fetchAndStripHtml] Fetched ${html.length} chars from ${url}`);
    
    // Strip HTML tags
    const stripped = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    console.log(`[fetchAndStripHtml] Stripped to ${stripped.length} chars`);
    return stripped;
  } catch (error: any) {
    console.error('[fetchAndStripHtml] Error fetching URL:', url, error);
    broadcastLog(`❌ Error fetching document: ${error.message}`, 'error');
    return '';
  }
}

async function getPressReleaseText(htmlUrl: string): Promise<string> {
  if (!htmlUrl) return '';
  
  try {
    broadcastLog(`📄 Scanning for Press Release link in: ${htmlUrl}`, 'info');
    
    const response = await fetch(htmlUrl, {
      headers: {
        'User-Agent': 'NAVHunter myemail@example.com'
      }
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch filing details: ${response.status}`);
      return '';
    }
    
    const html = await response.text();
    
    // Search for press release or EX-99 links (same regex as Python)
    const regex = /<a\s+[^>]*?href="([^"]+)"[^>]*>.*?(Press Release|EX-99).*?<\/a>/gi;
    const match = regex.exec(html);
    
    if (match) {
      const pressReleaseRelativeUrl = match[1];
      // Resolve relative URL to absolute
      const baseUrl = new URL(htmlUrl);
      const pressReleaseFullUrl = new URL(pressReleaseRelativeUrl, baseUrl).toString();
      
      broadcastLog(`📎 Found Press Release link: ${pressReleaseFullUrl}`, 'info');
      
      // Fetch and strip the press release
      const pressReleaseText = await fetchAndStripHtml(pressReleaseFullUrl);
      
      if (pressReleaseText) {
        broadcastLog(`✓ Press Release content fetched (${pressReleaseText.length} chars).`, 'info');
        return pressReleaseText;
      }
    } else {
      broadcastLog(`ℹ No Press Release link found in filing details.`, 'info');
    }
  } catch (error) {
    console.error('Error getting press release:', error);
    broadcastLog(`❌ Error processing press release: ${error}`, 'error');
  }
  
  return '';
}

export async function POST(request: NextRequest) {
  console.log('\n[Process Filing] Endpoint called');
  
  try {
    console.log('[Process Filing] Reading request body...');
    const body = await request.json();
    console.log('[Process Filing] Body received:', { 
      hasFiling: !!body.filing, 
      hasConfig: !!body.config,
      ticker: body.filing?.ticker 
    });
    
    const { filing, config } = body;
    
    console.log('\n[Process Filing] ========== START ==========');
    console.log('[Process Filing] Processing:', filing?.ticker, filing?.formType);
    console.log('[Process Filing] Filing URLs:', {
      linkToTxt: filing?.linkToTxt || 'none',
      linkToText: filing?.linkToText || 'none', 
      linkToHtml: filing?.linkToHtml || 'none',
      linkToFilingDetails: filing?.linkToFilingDetails || 'none'
    });
    console.log('[Process Filing] Config:', {
      formTypes: config?.formTypes,
      confidence: config?.confidence,
      aiModel: config?.aiModel,
      hasPrompt: !!config?.aiPrompt,
      promptLength: config?.aiPrompt?.length
    });
    
    // Update stats
    broadcastStats({ processed: 1 });
    
    // Fetch filing content
    let content = '';
    
    // Log available URLs
    broadcastLog(
      `🔍 Available URLs - TXT: ${filing.linkToTxt ? 'Yes' : 'No'}, Text: ${filing.linkToText ? 'Yes' : 'No'}, HTML: ${filing.linkToHtml ? 'Yes' : 'No'}, Details: ${filing.linkToFilingDetails ? 'Yes' : 'No'}`,
      'info'
    );
    
    // Try to get content from linkToTxt or linkToText first (main filing document)
    const txtUrl = filing.linkToTxt || filing.linkToText;
    if (txtUrl) {
      broadcastLog(`🌎 Fetching content from: ${txtUrl}`, 'info');
      
      content = await fetchAndStripHtml(txtUrl);
      
      if (content) {
        broadcastLog(`🧼 Stripping HTML and cleaning text...`, 'info');
        broadcastLog(`✓ Content processed successfully (${content.length} chars).`, 'info');
      } else {
        broadcastLog(`⚠️ No content fetched from ${txtUrl}`, 'warn');
      }
    } else {
      broadcastLog(`⚠️ No linkToTxt or linkToText URL available`, 'warn');
    }
    
    // If no txt content, try linkToHtml
    if (!content && filing.linkToHtml) {
      broadcastLog(`📄 Fetching filing content from HTML...`, 'info');
      content = await fetchAndStripHtml(filing.linkToHtml);
    }
    
    // Get press release content from filing details page (CRITICAL!)
    const pressReleaseContent = await getPressReleaseText(filing.linkToFilingDetails);
    
    // Combine filing and press release content (same as Python)
    if (pressReleaseContent) {
      content += `\n\n--- PRESS RELEASE CONTENT ---\n\n${pressReleaseContent}`;
      broadcastLog('🖇️ Combined filing and press release text for AI analysis.', 'info');
    }
    
    if (!content) {
      broadcastLog(`⚠ No content found for ${filing.ticker} - using metadata only`, 'warn');
      // Create minimal content from metadata
      content = `Company: ${filing.companyName}\nTicker: ${filing.ticker}\nForm Type: ${filing.formType}\nFiled: ${filing.filedAt}`;
    }
    
    // Log content status
    broadcastLog(`📃 Total content for analysis: ${content.length} chars`, 'info');
    
    // Check if we have enough content to analyze (same 50 char threshold as Python)
    if (content.trim().length <= 50) {
      broadcastLog(`⚠ Skipping ${filing.ticker} - insufficient content (${content.length} chars)`, 'warn');
      broadcast('test_ticker_finished', {});
      return Response.json({ success: true, skipped: true });
    }
    
    // Process through AI
    console.log('[Process Filing] Preparing AI analysis...');
    console.log('[Process Filing] Config:', { 
      hasPrompt: !!config?.aiPrompt,
      promptLength: config?.aiPrompt?.length,
      model: config?.aiModel 
    });
    
    const aiPrompt = config?.aiPrompt || '';
    if (!aiPrompt) {
      console.error('[Process Filing] No AI prompt provided!');
      broadcastLog(`❌ No AI prompt configured`, 'error');
      broadcast('test_ticker_finished', {});
      return Response.json({ success: true, skipped: true, reason: 'No AI prompt' });
    }
    
    const finalPrompt = aiPrompt
      .replace('{company}', filing.companyName || 'Unknown')
      .replace('{ticker}', filing.ticker || 'N/A')
      .replace('{formType}', filing.formType || 'Unknown');
    
    // Combine prompt with content (truncated to 50000 chars)
    const promptWithContent = finalPrompt + `\n\nFILING CONTENT TO ANALYZE:\n${content.substring(0, 50000)}...`;
    
    broadcastAILog(`🤖 Analyzing ${filing.companyName} (${filing.ticker}) using ${config?.aiModel || 'gpt-4o-mini'}...`, 'analysis', {
      request: promptWithContent,
      response: 'Waiting for AI response...'
    });
    
    console.log('[Process Filing] Calling AI analysis endpoint...');
    console.log('[Process Filing] Prompt length:', promptWithContent.length);
    console.log('[Process Filing] First 200 chars of prompt:', promptWithContent.substring(0, 200));
    
    const aiUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/ai/analyze`;
    console.log('[Process Filing] AI URL:', aiUrl);
    
    try {
      console.log('\n[Process Filing] === CALLING AI ANALYSIS ===');
      console.log('[Process Filing] Endpoint:', aiUrl);
      console.log('[Process Filing] Filing:', { 
        ticker: filing.ticker, 
        company: filing.companyName,
        formType: filing.formType 
      });
      console.log('[Process Filing] Config:', { 
        model: config?.aiModel,
        temperature: config?.aiTemperature,
        confidence: config?.confidence
      });
      console.log('[Process Filing] Prompt chars:', promptWithContent.length);
      console.log('[Process Filing] === END CALL INFO ===\n');
      
      const analysisResponse = await fetch(aiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Forward the auth cookie from the incoming request
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({ 
          filing,
          config,
          prompt: promptWithContent
        })
      });
    
    console.log('[Process Filing] AI response status:', analysisResponse.status);
    console.log('[Process Filing] AI response headers:', analysisResponse.headers);
    
    if (analysisResponse.ok) {
      const analysis = await analysisResponse.json();
      
      // Log the analysis result
      console.log('\n[Process Filing] === AI ANALYSIS RESULT ===');
      console.log('Alert worthy:', analysis.isAlertWorthy);
      console.log('Confidence:', analysis.confidenceScore);
      console.log('Full result:', JSON.stringify(analysis, null, 2));
      console.log('[Process Filing] === END RESULT ===\n');
      
      // Broadcast AI analysis details
      broadcastAILog(`📊 Analysis complete for ${filing.ticker}: Alert=${analysis.isAlertWorthy}, Confidence=${analysis.confidenceScore || 0}%`);
      
      // Check if alert worthy (same logic as Python)
      if (analysis.isAlertWorthy && parseInt(analysis.confidenceScore || 0) >= parseInt(config?.confidence || 65)) {
        const alertLevel = analysis.alertHighlight ? 'gold' : 'blue';
        
        // Broadcast the alert (Python uses 'new_alert' event)
        broadcastNewAlert({
          filing,
          aiAnalysis: analysis,
          alertLevel: alertLevel
        });
        
        // Also broadcast as 'alert' for UI compatibility
        broadcast('alert', {
          level: alertLevel,
          filing,
          aiAnalysis: analysis
        });
        
        if (alertLevel === 'gold') {
          broadcastAILog(`🥇 GOLD ALERT: ${filing.ticker} - Confidence: ${analysis.confidenceScore}%`, 'hit');
        } else {
          broadcastAILog(`🔵 BLUE ALERT: ${filing.ticker} - Confidence: ${analysis.confidenceScore}%`, 'analysis');
        }
        
        // Update alert stats
        broadcastStats({ alerts: 1 });
        
        // Generate TTS ONLY for gold alerts (alertHighlight is true)
        if (analysis.alertHighlight && analysis.textToSpeak) {
          broadcastAILog(`🎤 Generating speech for: "${analysis.textToSpeak}"`);
          
          const ttsResponse = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/ai/analyze`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              // Forward the auth cookie
              'Cookie': request.headers.get('cookie') || ''
            },
            body: JSON.stringify({ 
              text: analysis.textToSpeak,
              config 
            })
          });
          
          if (ttsResponse.ok) {
            const audioBuffer = await ttsResponse.arrayBuffer();
            const audioB64 = Buffer.from(audioBuffer).toString('base64');
            broadcast('play_tts_audio', { audioB64 });
          } else {
            broadcastAILog(`❌ OpenAI TTS failed`);
          }
        }
      } else {
        // Not alert worthy
        if (!analysis.isAlertWorthy) {
          broadcastAILog(`✓ Analyzed ${filing.ticker} - Not alert worthy`);
        } else {
          broadcastAILog(`✓ Analyzed ${filing.ticker} - Below confidence threshold (${analysis.confidenceScore}% < ${config?.confidence}%)`);
        }
      }
    } else {
      const errorText = await analysisResponse.text();
      console.error('AI analysis failed:', errorText);
      broadcastAILog(`❌ ChatGPT analysis failed: ${errorText}`);
    }
    } catch (analysisError: any) {
      console.error('AI analysis error:', analysisError);
      broadcastAILog(`❌ Failed to call AI analysis: ${analysisError.message}`);
    }
    
    // Signal test finished
    broadcast('test_ticker_finished', {});
    
    return Response.json({ success: true });
    
  } catch (error: any) {
    console.error('Process filing error:', error);
    console.error('Error stack:', error.stack);
    broadcastLog(`❌ Process filing error: ${error.message}`, 'error');
    broadcast('test_ticker_finished', {});
    return Response.json(
      { error: error.message || 'Failed to process filing' },
      { status: 500 }
    );
  }
}