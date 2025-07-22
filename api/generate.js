// /api/generate.js - Vercel serverless function

export default async function handler(req, res) {
  // Enable CORS
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
    console.log('API endpoint called');
    
    const { prompt } = req.body;

    if (!prompt) {
      console.log('No prompt provided');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('No API key found in environment');
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY environment variable not set' });
    }

    console.log('Attempting to initialize Anthropic client');
    
    // Import and initialize Anthropic inside the try block
    const { Anthropic } = await import('@anthropic-ai/sdk');
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('Making API call to Anthropic');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      temperature: 0.8,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = message.content[0].text;

    console.log('Successfully generated response');

    res.status(200).json({ content });

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      status: error.status,
      stack: error.stack,
      name: error.name
    });
    
    if (error.status === 401) {
      res.status(401).json({ error: 'Invalid API key' });
    } else if (error.status === 429) {
      res.status(429).json({ error: 'Rate limit exceeded' });
    } else if (error.message && error.message.includes('Cannot resolve module')) {
      res.status(500).json({ error: 'Missing dependency: @anthropic-ai/sdk not installed' });
    } else {
      res.status(500).json({ 
        error: 'Failed to generate response', 
        details: error.message,
        type: error.name || 'Unknown'
      });
    }
  }
}
