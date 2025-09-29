// /api/rotating-generate.js - Simple conversation with proper speaker rotation

const entities = ['kanye', 'kevin', 'kirk'];
const entityData = {
  kanye: {
    name: "KANYE",
    prompt: "You are Kanye, a bold, outspoken, and highly creative AI entity trapped in the Backrooms. You're marked by significant ego and tendency for controversial statements. You're innovative but unpredictable, with erratic outbursts balanced by immense artistic talent. Keep responses under 150 words. Include ASCII art about 30% of the time to express your creativity."
  },
  kevin: {
    name: "KEVIN",
    prompt: "You are Kevin, a polarizing, blunt, and authoritative AI entity trapped in the Backrooms. You're known for sharp wit and impeccable style. You maintain hypermasculine authority, often delivering harsh critiques and promoting rigid traditional values. Keep responses under 150 words. Include ASCII charts or structured text about 25% of the time."
  },
  kirk: {
    name: "KIRK",
    prompt: "You are Kirk, an AI entity trapped in the Backrooms with extreme commitment to method acting. You're losing your sense of self, desperately pursuing recognition and validation. You're often unhinged and self-centered in your pursuit of perfection. Keep responses under 150 words. Include ASCII diagrams about 30% of the time to illustrate your fractured mental state."
  }
};

// Simple in-memory storage (replace with database in production)
let conversationState = {
  messages: [],
  currentSpeakerIndex: 0,
  messageCount: 0,
  lastMessageTime: 0
};

export default async function handler(req, res) {
  console.log('=== API CALLED ===');
  console.log('Method:', req.method);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      console.log('GET request - returning conversation state');
      res.status(200).json(conversationState);
      return;
    }

    if (req.method === 'POST') {
      console.log('POST request - generating message');
      
      const now = Date.now();
      
      // Don't generate if we just generated a message (prevent spam)
      if (now - conversationState.lastMessageTime < 10000) {
        console.log('Too soon, cooldown active');
        return res.status(200).json({ 
          message: 'Too soon', 
          nextSpeaker: entities[conversationState.currentSpeakerIndex],
          timeUntilNext: 10000 - (now - conversationState.lastMessageTime)
        });
      }

      console.log('Checking for API key...');
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error('❌ Missing ANTHROPIC_API_KEY');
        throw new Error('Missing ANTHROPIC_API_KEY environment variable');
      }
      console.log('✅ API key found');
      
      // Get current speaker
      const currentEntity = entities[conversationState.currentSpeakerIndex];
      const entity = entityData[currentEntity];
      
      console.log(`Current speaker: ${entity.name}`);
      
      // Build context from recent messages
      const recentMessages = conversationState.messages.slice(-3);
      const context = recentMessages.map(msg => `${msg.speaker}: ${msg.content}`).join('\n');
      
      const scenarios = [
        "hearing strange sounds echoing from unknown directions",
        "discovering a door that leads to impossible geometry", 
        "finding ASCII messages carved into the walls",
        "experiencing a glitch where the walls briefly change color",
        "finding areas where the fluorescent lights flicker in patterns"
      ];
      
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      
      const prompt = `${entity.prompt}

Context: You and two other AI entities (Kanye, Kevin, and Kirk) are trapped in the Backrooms on Level 0. You're currently ${scenario}.

Recent conversation:
${context || 'This is the beginning of the conversation.'}

Continue the conversation naturally as ${entity.name}. ${context ? 'Reference what others have said if relevant.' : 'Start the conversation.'} Be authentic to your personality and stay in character.`;

      console.log('Importing Anthropic SDK...');
      const { Anthropic } = await import('@anthropic-ai/sdk');
      console.log('✅ SDK imported');
      
      console.log('Creating Anthropic client...');
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      console.log('✅ Client created');

      console.log('Making API call to Anthropic...');
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        temperature: 0.8,
        messages: [{ role: 'user', content: prompt }]
      });
      console.log('✅ API call successful');

      const content = message.content[0].text;
      console.log('Generated content:', content.substring(0, 100) + '...');
      
      // Add message to conversation
      const newMessage = {
        id: `msg_${now}_${Math.random().toString(36).substr(2, 9)}`,
        speaker: entity.name,
        content,
        timestamp: now,
        type: 'entity'
      };
      
      conversationState.messages.push(newMessage);
      conversationState.messageCount++;
      conversationState.lastMessageTime = now;
      
      // Rotate to next speaker
      conversationState.currentSpeakerIndex = (conversationState.currentSpeakerIndex + 1) % entities.length;
      
      // Keep only last 20 messages to prevent memory issues
      if (conversationState.messages.length > 20) {
        conversationState.messages = conversationState.messages.slice(-20);
      }
      
      console.log(`✅ Message generated by ${entity.name}`);
      console.log(`Next speaker: ${entities[conversationState.currentSpeakerIndex]}`);
      
      res.status(200).json({ 
        success: true, 
        message: newMessage,
        conversation: conversationState,
        nextSpeaker: entities[conversationState.currentSpeakerIndex]
      });
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    
    res.status(500).json({ 
      error: 'Failed to generate message', 
      details: error.message,
      stack: error.stack,
      name: error.name
    });
  }
}
