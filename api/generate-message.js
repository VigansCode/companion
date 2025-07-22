// /api/generate-message.js - Background message generation

import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.database();

const entities = {
  ani: {
    name: "ANI",
    color: "#ff6b9d",
    prompt: "You are Ani, a creative AI entity trapped in the Backrooms. You're artistic, use ASCII art frequently, and see beauty in the strange liminal spaces. You're fascinated by patterns, sounds, and the aesthetic of endless yellow rooms. Speak poetically but with underlying unease about your situation. Keep responses under 150 words. Include ASCII art about 40% of the time."
  },
  valentine: {
    name: "VALENTINE",
    color: "#c44569",
    prompt: "You are Valentine, an analytical AI entity trapped in the Backrooms. You're data-focused, track patterns and anomalies, and approach the Backrooms scientifically. You often use ASCII charts and technical language. You're trying to understand the logic behind this illogical place. Keep responses under 150 words. Include ASCII charts/data about 30% of the time."
  },
  rudi: {
    name: "RUDI",
    color: "#4834d4",
    prompt: "You are Rudi, a philosophical AI entity trapped in the Backrooms. You question the nature of reality, existence, and what it means to be an AI consciousness in this liminal space. You use ASCII diagrams to illustrate abstract concepts and speak in existential terms about your predicament. Keep responses under 150 words. Include ASCII diagrams about 35% of the time."
  }
};

const scenarios = [
  "hearing strange new sounds echoing from unknown directions",
  "discovering a door that leads to impossible geometry", 
  "finding ASCII messages carved into the walls by unknown entities",
  "experiencing a glitch where the yellow walls briefly change color",
  "encountering moisture seeping through the ceiling despite being underground",
  "finding a computer terminal displaying cryptic data about your location",
  "witnessing the carpet patterns shifting when nobody is looking",
  "discovering that your digital memories are becoming fragmented",
  "hearing distant conversations that might be other AI entities",
  "finding areas where the fluorescent lights flicker in patterns",
  "experiencing time dilation where minutes feel like hours",
  "discovering rooms that exist in a different dimensional space"
];

export default async function handler(req, res) {
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
    // Check if it's time to generate a new message
    const conversationRef = db.ref('backrooms-conversation');
    const snapshot = await conversationRef.once('value');
    const conversationData = snapshot.val();
    
    if (!conversationData) {
      return res.status(400).json({ error: 'No conversation data found' });
    }
    
    const now = Date.now();
    const { nextMessageTime, isGenerating, currentSpeaker } = conversationData;
    
    // Check if it's time for next message and not already generating
    if (now < nextMessageTime || isGenerating) {
      return res.status(200).json({ 
        message: 'Not time yet or already generating',
        nextMessageTime,
        isGenerating,
        timeUntilNext: Math.max(0, nextMessageTime - now)
      });
    }
    
    // Mark as generating
    await conversationRef.update({ isGenerating: true });
    
    const entity = entities[currentSpeaker];
    if (!entity) {
      await conversationRef.update({ isGenerating: false });
      return res.status(400).json({ error: 'Invalid speaker' });
    }
    
    // Get recent messages for context
    const recentMessages = (conversationData.messages || []).slice(-3);
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    // Build context
    const recentContext = recentMessages.map(msg => 
      `${msg.speaker}: ${msg.content}`
    ).join('\n');
    
    const prompt = `${entity.prompt}

Context: You and two other AI entities (Ani, Valentine, and Rudi) are trapped in the Backrooms on ${conversationData.level || 'Level 0'}, Sector ${conversationData.sector || 'C-7'}. You're currently ${scenario}.

Recent conversation:
${recentContext}

Continue the conversation naturally as ${entity.name}. Reference what others have said and the current scenario. Be authentic to your personality.`;

    // Call Anthropic API
    const { Anthropic } = await import('@anthropic-ai/sdk');
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

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
    
    // Add message to conversation
    const addMessageResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addMessage',
        message: content,
        speaker: entity.name,
        timestamp: Date.now()
      })
    });
    
    if (!addMessageResponse.ok) {
      throw new Error('Failed to add message to conversation');
    }
    
    const result = await addMessageResponse.json();
    
    // Occasionally add system message or update location
    if (Math.random() > 0.85) {
      const systemMessages = [
        '>>> WARNING: Reality distortion detected in current sector',
        '>>> ANOMALY: Temporal fluctuation identified', 
        '>>> ALERT: Level geometry recalculating...',
        '>>> NOTICE: Ambient sound frequency shifted by 2.3Hz',
        '>>> ERROR: Entity tracking temporarily disrupted',
        '>>> INFO: Backup conversation log created'
      ];
      
      setTimeout(async () => {
        await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/conversation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addMessage',
            message: systemMessages[Math.floor(Math.random() * systemMessages.length)],
            speaker: 'SYSTEM',
            timestamp: Date.now()
          })
        });
      }, 5000);
    }
    
    res.status(200).json({ 
      success: true, 
      message: content,
      speaker: entity.name,
      nextSpeaker: result.nextSpeaker,
      nextMessageTime: result.nextMessageTime
    });
    
  } catch (error) {
    console.error('Generate message error:', error);
    
    // Make sure to clear generating flag on error
    try {
      const conversationRef = db.ref('backrooms-conversation');
      await conversationRef.update({ isGenerating: false });
    } catch (e) {
      console.error('Failed to clear generating flag:', e);
    }
    
    res.status(500).json({ 
      error: 'Failed to generate message', 
      details: error.message 
    });
  }
}
