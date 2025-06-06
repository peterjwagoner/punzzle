// firebase-setup.js - Netlify API Version
// Uses Netlify Functions instead of client-side Firebase

// Your Firebase configuration (still needed for client-side features)
const firebaseConfig = {
  apiKey: "AIzaSyDD6fIiRCLLQFUUyUrq-AnipZdomJoVgB8",
  authDomain: "punzzle.firebaseapp.com",
  projectId: "punzzle",
  storageBucket: "punzzle.firebasestorage.app",
  messagingSenderId: "764724354815",
  appId: "1:764724354815:web:339f700ef4165fd45576ca"
};

// Initialize Firebase for client-side features (analytics, etc.)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
window.db = db;

// Enable offline persistence for client-side operations
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    console.log('Persistence failed: Multiple tabs open');
  } else if (err.code == 'unimplemented') {
    console.log('Persistence not available in this browser');
  }
});

// API base URL for Netlify functions
const API_BASE = '/.netlify/functions/puzzle';

// Helper functions for puzzles - now using Netlify API
const PuzzleDB = {
  // Get puzzle for a specific date
  async getDailyPuzzle(date) {
    try {
      const dateStr = date.toISOString().split('T')[0];
      console.log(`🌐 Fetching puzzle via API for date: ${dateStr}`);
      console.log(`🔗 API URL: ${API_BASE}?type=daily&date=${dateStr}`);
      
      const response = await fetch(`${API_BASE}?type=daily&date=${dateStr}`);
      
      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response headers:`, response.headers);
      
      // Log the raw response text for debugging
      const responseText = await response.text();
      console.log(`📡 Raw response:`, responseText);
      
      if (response.ok && responseText.trim()) {
        try {
          const data = JSON.parse(responseText);
          console.log(`✅ API puzzle loaded successfully: ${data.categories}`);
          return data;
        } catch (parseError) {
          console.error('❌ Error parsing JSON response:', parseError);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
      } else if (response.status === 404) {
        console.log(`📅 No puzzle found for ${dateStr}`);
        return null;
      } else {
        throw new Error(`API error: ${response.status} - ${responseText}`);
      }
    } catch (error) {
      console.error('❌ Error getting daily puzzle via API:', error);
      console.error('❌ Error details:', error.message, error.stack);
      return null;
    }
  },

    } catch (error) {
      console.error('❌ Error getting daily puzzle via API:', error);
      return null;
    }
  },

  // Get bonus puzzle by ID
  async getBonusPuzzle(bonusId) {
    try {
      console.log(`🌐 Fetching bonus puzzle via API: ${bonusId}`);
      console.log(`🔗 API URL: ${API_BASE}?type=bonus&bonusId=${bonusId}`);
      
      const response = await fetch(`${API_BASE}?type=bonus&bonusId=${bonusId}`);
      
      console.log(`📡 Response status: ${response.status}`);
      const responseText = await response.text();
      console.log(`📡 Raw response:`, responseText);
      
      if (response.ok && responseText.trim()) {
        try {
          const data = JSON.parse(responseText);
          console.log(`✅ Bonus puzzle loaded: ${data.categories}`);
          return data;
        } catch (parseError) {
          console.error('❌ Error parsing JSON response:', parseError);
          throw new Error(`Invalid JSON response: ${responseText}`);
        }
      } else {
        console.log(`📅 Bonus puzzle not found: ${bonusId}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting bonus puzzle via API:', error);
      console.error('❌ Error details:', error.message, error.stack);
      return null;
    }
  },

      return null;
    }
  },

  // Save puzzle (for admin) - still uses client SDK
  async savePuzzle(puzzle) {
    try {
      if (!puzzle.date) {
        throw new Error('Puzzle date is required');
      }
      
      console.log('Saving puzzle via client SDK:', puzzle);
      
      await db.collection('puzzles').doc(puzzle.date).set({
        ...puzzle,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Puzzle saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Error saving puzzle:', error);
      return false;
    }
  },

  // Save bonus puzzle (for admin)
  async saveBonusPuzzle(puzzle) {
    try {
      console.log('Saving bonus puzzle via client SDK:', puzzle);
      
      const docRef = await db.collection('bonusPuzzles').add({
        ...puzzle,
        created: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Bonus puzzle saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error saving bonus puzzle:', error);
      return null;
    }
  },

  // Get all puzzles (for admin)
  async getAllPuzzles() {
    try {
      console.log('Fetching all puzzles via client SDK...');
      
      const snapshot = await db.collection('puzzles')
        .orderBy('date', 'desc')
        .limit(100)
        .get();
      
      const puzzles = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data && data.date) {
          puzzles.push(data);
        }
      });
      
      console.log(`✅ Fetched ${puzzles.length} puzzles`);
      return puzzles;
    } catch (error) {
      console.error('❌ Error getting all puzzles:', error);
      return [];
    }
  },

  // Delete puzzle (for admin)
  async deletePuzzle(date) {
    try {
      await db.collection('puzzles').doc(date).delete();
      console.log('✅ Puzzle deleted:', date);
      return true;
    } catch (error) {
      console.error('❌ Error deleting puzzle:', error);
      return false;
    }
  }
};

// Helper functions for analytics - still use client SDK
const AnalyticsDB = {
  async trackCompletion(data) {
    try {
      await db.collection('gameStats').add({
        ...data,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('❌ Error tracking completion:', error);
      return false;
    }
  },

  async trackCustomPuzzle(puzzleId, data) {
    try {
      const docRef = db.collection('customPuzzleStats').doc(puzzleId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        await docRef.update({
          plays: firebase.firestore.FieldValue.increment(1),
          totalScore: firebase.firestore.FieldValue.increment(data.score || 0),
          completed: data.completed ? firebase.firestore.FieldValue.increment(1) : firebase.firestore.FieldValue.increment(0),
          lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await docRef.set({
          plays: 1,
          completed: data.completed ? 1 : 0,
          totalScore: data.score || 0,
          firstPlayed: firebase.firestore.FieldValue.serverTimestamp(),
          lastPlayed: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      return true;
    } catch (error) {
      console.error('❌ Error tracking custom puzzle:', error);
      return false;
    }
  },

  async getAnalytics(startDate, endDate) {
    try {
      const query = db.collection('gameStats')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'desc')
        .limit(1000);
      
      const snapshot = await query.get();
      const stats = [];
      snapshot.forEach(doc => {
        stats.push({ id: doc.id, ...doc.data() });
      });
      return stats;
    } catch (error) {
      console.error('❌ Error getting analytics:', error);
      return [];
    }
  },

  async getCustomPuzzleStats() {
    try {
      const snapshot = await db.collection('customPuzzleStats').get();
      const stats = {};
      snapshot.forEach(doc => {
        stats[doc.id] = doc.data();
      });
      return stats;
    } catch (error) {
      console.error('❌ Error getting custom puzzle stats:', error);
      return {};
    }
  }
};

// Save custom puzzle - now uses API
async function saveCustomPuzzle(puzzleData) {
  try {
    console.log('🌐 Saving custom puzzle via API:', puzzleData);
    console.log(`🔗 API URL: ${API_BASE}?type=custom`);
    
    const response = await fetch(`${API_BASE}?type=custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(puzzleData)
    });
    
    console.log(`📡 Response status: ${response.status}`);
    const responseText = await response.text();
    console.log(`📡 Raw response:`, responseText);
    
    if (response.ok && responseText.trim()) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ Custom puzzle saved via API:', result.id);
        return result.id;
      } catch (parseError) {
        console.error('❌ Error parsing JSON response:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
    } else {
      throw new Error(`API error: ${response.status} - ${responseText}`);
    }
  } catch (error) {
    console.error('❌ Error saving custom puzzle via API:', error);
    console.error('❌ Error details:', error.message, error.stack);
    return null;
  }
}

      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error saving custom puzzle via API:', error);
    return null;
  }
}

// Make everything globally available
window.saveCustomPuzzle = saveCustomPuzzle;
window.PuzzleDB = PuzzleDB;
window.AnalyticsDB = AnalyticsDB;

// Simple debug function
window.checkDatabase = function() {
  console.log('🌐 Testing API connection...');
  const testUrl = `${API_BASE}?type=daily&date=${new Date().toISOString().split('T')[0]}`;
  console.log('🔗 Testing URL:', testUrl);
  
  fetch(testUrl)
    .then(response => {
      console.log('📡 Test response status:', response.status);
      return response.text().then(text => ({ status: response.status, text, ok: response.ok }));
    })
    .then(({ status, text, ok }) => {
      console.log('📡 Test response text:', text);
      if (ok && text.trim()) {
        console.log('✅ API connection successful');
        return JSON.parse(text);
      } else if (status === 404) {
        console.log('🔍 API working, but no puzzle found for today');
        console.log('💡 Add puzzles to your Firebase database');
      } else {
        throw new Error(`API error: ${status} - ${text}`);
      }
    })
    .then(data => {
      if (data) {
        console.log('📋 Today\'s puzzle:', data.categories);
      }
    })
    .catch(error => {
      console.error('❌ API connection failed:', error);
    });
};
    .then(data => {
      if (data) {
        console.log('📋 Today\'s puzzle:', data.categories);
      }
    })
    .catch(error => {
      console.error('❌ API connection failed:', error);
    });
};

// Log when ready
console.log('🚀 Punzzle API initialized');
console.log('🔧 Run window.checkDatabase() to test API connection');

// Add simple function test
window.testFunction = function() {
  console.log('🧪 Testing simple function...');
  fetch('/.netlify/functions/test')
    .then(response => response.text())
    .then(text => console.log('🧪 Test function response:', text))
    .catch(error => console.error('🧪 Test function error:', error));
};
console.log('🧪 Run window.testFunction() to test basic function connectivity');

// Add environment variable test
window.testEnv = function() {
  console.log('🔧 Testing environment variables...');
  fetch('/.netlify/functions/env-test')
    .then(response => response.json())
    .then(data => console.log('🔧 Environment check:', data))
    .catch(error => console.error('🔧 Environment test error:', error));
};
console.log('🔧 Run window.testEnv() to check environment variables');