// firebase-setup.js - Clean Admin Panel Version
// This version prioritizes admin panel functionality

console.log('🚀 Loading Firebase for Admin Panel...');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDD6fIiRCLLQFUUyUrq-AnipZdomJoVgB8",
  authDomain: "punzzle.firebaseapp.com",
  projectId: "punzzle",
  storageBucket: "punzzle.firebasestorage.app",
  messagingSenderId: "764724354815",
  appId: "1:764724354815:web:339f700ef4165fd45576ca"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  window.db = db;
  
  console.log('✅ Firebase initialized successfully');
  
  // Enable offline persistence
  db.enablePersistence().catch((err) => {
    if (err.code == 'failed-precondition') {
      console.log('🔄 Multiple tabs open - persistence disabled');
    } else if (err.code == 'unimplemented') {
      console.log('📱 Persistence not supported in this browser');
    }
  });
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

// Admin Panel Database Functions
const PuzzleDB = {
  async savePuzzle(puzzle) {
    try {
      if (!puzzle.date) {
        throw new Error('Puzzle date is required');
      }
      
      console.log('💾 Saving puzzle:', puzzle.date);
      
      const docRef = db.collection('puzzles').doc(puzzle.date);
      await docRef.set({
        ...puzzle,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Puzzle saved successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error saving puzzle:', error);
      
      // Show user-friendly error messages
      if (error.code === 'permission-denied') {
        console.error('🔒 Firebase security rules are blocking the save');
      } else if (error.code === 'unavailable') {
        console.error('🌐 Firebase is unavailable - check internet connection');
      }
      
      return false;
    }
  },

  async getAllPuzzles() {
    try {
      console.log('📚 Loading all puzzles...');
      
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
      
      console.log(`✅ Loaded ${puzzles.length} puzzles`);
      return puzzles;
      
    } catch (error) {
      console.error('❌ Error loading puzzles:', error);
      return [];
    }
  },

  async deletePuzzle(date) {
    try {
      console.log('🗑️ Deleting puzzle:', date);
      
      await db.collection('puzzles').doc(date).delete();
      
      console.log('✅ Puzzle deleted successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error deleting puzzle:', error);
      return false;
    }
  },

  async saveBonusPuzzle(puzzle) {
    try {
      console.log('💾 Saving bonus puzzle...');
      
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

  async getBonusPuzzle(bonusId) {
    try {
      const doc = await db.collection('bonusPuzzles').doc(bonusId).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting bonus puzzle:', error);
      return null;
    }
  },

  async getDailyPuzzle(date) {
    try {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      const doc = await db.collection('puzzles').doc(dateStr).get();
      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting daily puzzle:', error);
      return null;
    }
  }
};

// Analytics Functions
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

// Custom Puzzle Save Function
async function saveCustomPuzzle(puzzleData) {
  try {
    console.log('💾 Saving custom puzzle...');
    
    const docRef = await db.collection('customPuzzles').add({
      ...puzzleData,
      created: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Custom puzzle saved with ID:', docRef.id);
    return docRef.id;
    
  } catch (error) {
    console.error('❌ Error saving custom puzzle:', error);
    return null;
  }
}

// Make functions globally available
window.PuzzleDB = PuzzleDB;
window.AnalyticsDB = AnalyticsDB;
window.saveCustomPuzzle = saveCustomPuzzle;

// Test database connection
async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Try to read from puzzles collection
    const testRead = await db.collection('puzzles').limit(1).get();
    console.log('✅ Read test passed');
    
    // Try to write to test collection
    const testWrite = await db.collection('test').add({
      test: 'connection',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Write test passed');
    
    // Clean up test document
    await testWrite.delete();
    console.log('✅ Database connection fully working');
    
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    
    if (error.code === 'permission-denied') {
      console.error('🔒 Permission denied - check Firebase security rules');
    } else if (error.code === 'unavailable') {
      console.error('🌐 Firebase unavailable - check internet connection');
    }
    
    return false;
  }
}

// Auto-test connection after a short delay
setTimeout(testConnection, 2000);

// Debug function for manual testing
window.checkDatabase = testConnection;

console.log('✅ Firebase setup complete for Admin Panel');
console.log('🔧 Run window.checkDatabase() to test connection manually');