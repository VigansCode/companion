// /api/test-debug.js - Debug what's working and what's not

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('=== DEBUGGING API ===');
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: {},
      dependencies: {},
      errors: []
    };
    
    // Check environment variables
    console.log('Checking environment variables...');
    results.environment = {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      FIREBASE_DATABASE_URL: !!process.env.FIREBASE_DATABASE_URL,
      NODE_VERSION: process.version
    };
    
    // Test Anthropic SDK
    console.log('Testing Anthropic SDK...');
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      results.dependencies.anthropic = 'OK - Can import';
      
      if (process.env.ANTHROPIC_API_KEY) {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        results.dependencies.anthropicInit = 'OK - Can initialize';
      } else {
        results.dependencies.anthropicInit = 'FAILED - No API key';
      }
    } catch (error) {
      results.dependencies.anthropic = `FAILED - ${error.message}`;
      results.errors.push(`Anthropic SDK: ${error.message}`);
    }
    
    // Test Firebase Admin
    console.log('Testing Firebase Admin...');
    try {
      const admin = await import('firebase-admin');
      results.dependencies.firebaseAdmin = 'OK - Can import';
      
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        results.dependencies.firebaseConfig = 'OK - Has required env vars';
      } else {
        results.dependencies.firebaseConfig = 'FAILED - Missing env vars';
      }
    } catch (error) {
      results.dependencies.firebaseAdmin = `FAILED - ${error.message}`;
      results.errors.push(`Firebase Admin: ${error.message}`);
    }
    
    // Test basic API call
    console.log('Testing basic functionality...');
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const { Anthropic } = await import('@anthropic-ai/sdk');
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 50,
          messages: [{ role: 'user', content: 'Say "test successful"' }]
        });
        
        results.dependencies.anthropicTest = 'OK - API call successful';
        results.testResponse = message.content[0].text;
      } catch (error) {
        results.dependencies.anthropicTest = `FAILED - ${error.message}`;
        results.errors.push(`Anthropic API call: ${error.message}`);
      }
    }
    
    console.log('Debug results:', results);
    
    res.status(200).json(results);
    
  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ 
      error: 'Debug failed', 
      details: error.message,
      stack: error.stack 
    });
  }
}
