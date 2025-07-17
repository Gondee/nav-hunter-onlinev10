import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { broadcastAILog } from '@/lib/realtime/server';

export async function POST(request: NextRequest) {
  try {
    const { filing, config, prompt } = await request.json();
    
    console.log('[AI Analysis] Request received for:', filing?.ticker);
    broadcastAILog(`🔍 AI Analysis request received for ${filing?.ticker}`);
    
    if (!filing) {
      console.log('[AI Analysis] Error: No filing data provided');
      return Response.json({ error: 'Filing data required' }, { status: 400 });
    }
    
    // Get API key from config or environment
    const apiKey = config?.openaiApiKey || process.env.OPENAI_API_KEY;
    console.log('[AI Analysis] API Key check:', apiKey ? 'Present' : 'Missing');
    
    if (!apiKey) {
      console.log('[AI Analysis] Error: No OpenAI API key');
      broadcastAILog('❌ OpenAI API key not configured');
      return Response.json({ isAlertWorthy: false, error: 'OpenAI API key not configured' });
    }
    
    const openai = new OpenAI({ apiKey });
    
    // If a prompt is provided, use it directly (it already includes content)
    // Otherwise, build the prompt from the template
    let userPrompt = prompt;
    
    if (!userPrompt) {
      const systemPrompt = config?.aiPrompt || `You are an AI assistant analyzing SEC filings. Provide concise, relevant insights.`;
      userPrompt = systemPrompt
        .replace('{company}', filing.companyName || 'Unknown')
        .replace('{ticker}', filing.ticker || 'N/A')
        .replace('{formType}', filing.formType || 'Unknown');
    }
    
    console.log('[AI Analysis] Prompt length:', userPrompt.length);
    console.log('[AI Analysis] Using model:', config?.aiModel || 'gpt-4o-mini');
    
    // Log the AI request
    broadcastAILog(`📤 Analyzing ${filing.ticker} - ${filing.formType}...`);
    
    console.log('[AI Analysis] Sending request to OpenAI...');
    
    // Log the full request being sent
    const aiRequest = {
      model: config?.aiModel || 'gpt-4o-mini',
      messages: [
        { role: 'system' as const, content: 'You must respond with valid JSON only. No markdown formatting.' },
        { role: 'user' as const, content: userPrompt }
      ],
      temperature: config?.aiTemperature || 0.1,
      max_tokens: 500,
    };
    
    console.log('\n=== OPENAI REQUEST ===');
    console.log('Model:', aiRequest.model);
    console.log('Temperature:', aiRequest.temperature);
    console.log('Max tokens:', aiRequest.max_tokens);
    console.log('System message:', aiRequest.messages[0].content);
    console.log('\nUser prompt (first 1000 chars):');
    console.log(userPrompt.substring(0, 1000));
    console.log('\nUser prompt (last 500 chars):');
    console.log(userPrompt.substring(userPrompt.length - 500));
    console.log('=== END REQUEST ===\n');
    
    broadcastAILog(`📤 Sending to OpenAI (${userPrompt.length} chars)...`);
    
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create(aiRequest);
    
    const responseTime = Date.now() - startTime;
    console.log(`[AI Analysis] OpenAI response received in ${responseTime}ms`);
    
    const analysisText = completion.choices[0]?.message?.content || '{"isAlertWorthy": false}';
    
    console.log('\n=== OPENAI RESPONSE ===');
    console.log('Response time:', responseTime + 'ms');
    console.log('Finish reason:', completion.choices[0]?.finish_reason);
    console.log('Usage:', completion.usage);
    console.log('\nRaw response:');
    console.log(analysisText);
    console.log('=== END RESPONSE ===\n');
    
    broadcastAILog(`📥 OpenAI responded in ${responseTime}ms`);
    
    // Log the AI response with details for clicking
    broadcastAILog(`📥 AI Response received for ${filing.ticker} (${analysisText.length} chars)`, 'info', {
      request: userPrompt,
      response: analysisText
    });
    
    try {
      // Parse AI response as JSON
      console.log('[AI Analysis] Parsing JSON response...');
      const analysis = JSON.parse(analysisText);
      console.log('[AI Analysis] Parsed analysis:', analysis);
      
      // Log if alert worthy with details
      if (analysis.isAlertWorthy) {
        console.log('[AI Analysis] ALERT WORTHY! Confidence:', analysis.confidenceScore);
        const alertType = analysis.alertHighlight ? 'GOLD' : 'BLUE';
        broadcastAILog(`🎯 ${alertType} Alert: ${filing.ticker} - Confidence: ${analysis.confidenceScore}%`, 'hit', {
          request: userPrompt,
          response: analysisText
        });
      } else {
        console.log('[AI Analysis] Not alert worthy');
        broadcastAILog(`✓ Analysis complete: ${filing.ticker} - Not alert worthy`, 'info', {
          request: userPrompt,
          response: analysisText
        });
      }
      
      console.log('[AI Analysis] Returning response');
      return Response.json(analysis);
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisText);
      broadcastAILog(`❌ Failed to parse AI response for ${filing.ticker}`);
      return Response.json({ isAlertWorthy: false, error: 'Invalid AI response format' });
    }
    
  } catch (error: any) {
    console.error('[AI Analysis] Error:', error);
    console.error('[AI Analysis] Error stack:', error.stack);
    broadcastAILog(`❌ AI Error: ${error.message || 'Failed to analyze filing'}`);
    // Return 200 status to allow processing to continue, matching Python behavior
    return Response.json({ 
      isAlertWorthy: false, 
      error: error.message || 'Failed to analyze filing',
      analysis: 'AI analysis unavailable due to API error'
    });
  }
}

// Text-to-speech endpoint
export async function PUT(request: NextRequest) {
  try {
    const { text, voice = 'alloy', config } = await request.json();
    
    if (!text) {
      return Response.json({ error: 'Text required' }, { status: 400 });
    }
    
    // Get API key from config or environment
    const apiKey = config?.openaiApiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return Response.json({ error: 'OpenAI API key not configured' }, { status: 400 });
    }
    
    const openai = new OpenAI({ apiKey });
    
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: voice as any,
      input: text,
    });
    
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('TTS error:', error);
    broadcastAILog(`❌ OpenAI TTS failed: ${error.message}`);
    // Return empty audio to allow processing to continue
    return new Response(new ArrayBuffer(0), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': '0',
      },
    });
  }
}