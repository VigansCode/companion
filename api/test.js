// /api/test.js - Simple test endpoint to debug the setup

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Test endpoint called');
    
    // Check if environment variable exists
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
    const apiKeyLength = process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0;
    
    // Check if we can import the SDK
    let canImportSDK = false;
    let sdkError = null;
    
    try {
      const { Anthropic } = await import('@anthropic-ai/sdk');
      canImportSDK = true;
    } catch (error) {
      sdkError = error.message;
    }
    
    res.status(200).json({
      status: 'API endpoint working',
      environment: {
        hasApiKey,
        apiKeyLength: hasApiKey ? `${apiKeyLength} characters` : 'Not set',
        nodeVersion: process.version,
        platform: process.platform
      },
      sdk: {
        canImport: canImportSDK,
        error: sdkError
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      error: 'Test endpoint failed',
      details: error.message
    });
  }
}
