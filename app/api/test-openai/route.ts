import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return Response.json({ 
        error: 'No OPENAI_API_KEY found in environment',
        hint: 'Check your .env.local file'
      }, { status: 500 });
    }
    
    // Mask the API key for security
    const maskedKey = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
    
    console.log('\n=== TESTING OPENAI CONNECTION ===');
    console.log('API Key found:', maskedKey);
    console.log('Key length:', apiKey.length);
    
    const openai = new OpenAI({ apiKey });
    
    console.log('Sending test request to OpenAI...');
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system' as const, content: 'Respond with a simple JSON object' },
          { role: 'user' as const, content: 'Return JSON: {"status": "working", "message": "OpenAI connected"}' }
        ],
        temperature: 0,
        max_tokens: 50,
      });
      
      const response = completion.choices[0]?.message?.content || '';
      console.log('OpenAI response:', response);
      console.log('=== END OPENAI TEST ===\n');
      
      return Response.json({
        success: true,
        apiKeyPresent: true,
        maskedKey,
        openaiResponse: response,
        message: 'OpenAI API is working correctly'
      });
      
    } catch (openaiError: any) {
      console.error('OpenAI API Error:', openaiError.message);
      console.error('Error type:', openaiError.type);
      console.error('Error code:', openaiError.code);
      console.log('=== END OPENAI TEST ===\n');
      
      return Response.json({
        success: false,
        apiKeyPresent: true,
        maskedKey,
        error: openaiError.message,
        errorType: openaiError.type,
        errorCode: openaiError.code,
        hint: 'Check if your API key is valid and has credits'
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Test error:', error);
    return Response.json({ 
      error: error.message,
      hint: 'Check server logs for details'
    }, { status: 500 });
  }
}