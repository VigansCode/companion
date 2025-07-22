// /api/conversation.js - Manages the global conversation state

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get conversation state
      const conversationRef = db.ref('backrooms-conversation');
      const snapshot = await conversationRef.once('value');
      const data = snapshot.val();
      
      if (!data) {
        // Initialize conversation if it doesn't exist
        const initialState = {
          messages: [],
          currentSpeaker: 'ani',
          messageCount: 0,
          level: 'Level 0',
          sector: 'C-7',
          lastActivity: admin.database.ServerValue.TIMESTAMP,
          isGenerating: false,
          nextMessageTime: Date.now() + 30000 // 30 seconds from now
        };
        
        await conversationRef.set(initialState);
        return res.status(200).json(initialState);
      }
      
      res.status(200).json(data);
      
    } else if (req.method === 'POST') {
      const { action, message, speaker, timestamp } = req.body;
      
      if (action === 'addMessage') {
        // Add new message to conversation
        const conversationRef = db.ref('backrooms-conversation');
        const snapshot = await conversationRef.once('value');
        const currentData = snapshot.val() || { messages: [], messageCount: 0 };
        
        const newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          speaker,
          content: message,
          timestamp: timestamp || admin.database.ServerValue.TIMESTAMP,
          type: speaker === 'SYSTEM' ? 'system' : 'entity'
        };
        
        const updatedMessages = [...(currentData.messages || []), newMessage];
        
        // Keep only last 50 messages to prevent database bloat
        if (updatedMessages.length > 50) {
          updatedMessages.splice(0, updatedMessages.length - 50);
        }
        
        // Determine next speaker
        const entityOrder = ['ani', 'valentine', 'rudi'];
        const currentIndex = entityOrder.indexOf(currentData.currentSpeaker || 'ani');
        const nextSpeaker = entityOrder[(currentIndex + 1) % 3];
        
        // Random delay between 30 seconds and 2 minutes
        const nextMessageDelay = Math.random() * 90000 + 30000;
        
        await conversationRef.update({
          messages: updatedMessages,
          messageCount: (currentData.messageCount || 0) + 1,
          currentSpeaker: nextSpeaker,
          lastActivity: admin.database.ServerValue.TIMESTAMP,
          isGenerating: false,
          nextMessageTime: Date.now() + nextMessageDelay
        });
        
        res.status(200).json({ success: true, nextSpeaker, nextMessageTime: Date.now() + nextMessageDelay });
        
      } else if (action === 'setGenerating') {
        // Mark that a message is being generated
        const conversationRef = db.ref('backrooms-conversation');
        await conversationRef.update({
          isGenerating: req.body.isGenerating,
          lastActivity: admin.database.ServerValue.TIMESTAMP
        });
        
        res.status(200).json({ success: true });
        
      } else if (action === 'updateLocation') {
        // Update the current location
        const conversationRef = db.ref('backrooms-conversation');
        await conversationRef.update({
          level: req.body.level,
          sector: req.body.sector,
          lastActivity: admin.database.ServerValue.TIMESTAMP
        });
        
        res.status(200).json({ success: true });
        
      } else {
        res.status(400).json({ error: 'Invalid action' });
      }
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Conversation API error:', error);
    res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
}
