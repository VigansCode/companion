// /api/simple-generate.js - Simplified version without Firebase for testing

export default async function handler(req, res) {
  console.log('=== SIMPLE GENERATE API CALLED ===');
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Checking environment variables...');
    
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('❌ Missing ANTHROPIC_API_KEY');
      return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY environment variable' });
    }
    
    console.log('✅ ANTHROPIC_API_KEY found');
    console.log('Importing Anthropic SDK...');
    
    const { Anthropic } = await import('@anthropic-ai/sdk');
    console.log('✅ Anthropic SDK imported');
    
    console.log('Initializing Anthropic client...');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    console.log('✅ Anthropic client initialized');
    
    // Simple test prompt
    const testPrompt = `You are Ani, a creative AI entity trapped in the Backrooms. You're artistic and see beauty in the strange liminal spaces. Respond as Ani with a short message about being in the endless yellow rooms. Keep it under 100 words.`;
    
    console.log('Making API call to Anthropic...');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: testPrompt
        }
      ]
    });
    
    console.log('✅ Anthropic API call successful');
    const content = message.content[0].text;
    console.log('Generated content:', content);
    
    res.status(200).json({ 
      success: true, 
      message: content,
      speaker: 'ANI',
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('❌ Simple generate error:', {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to generate message', 
      details: error.message,
      type: error.name || 'Unknown',
      timestamp: Date.now()
    });
  }
}
