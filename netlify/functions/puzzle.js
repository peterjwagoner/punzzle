const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

const db = admin.firestore();

// THIS IS THE KEY PART - Make sure you have exports.handler
exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { date, type, bonusId } = event.queryStringParameters || {};

    // Handle different types of puzzle requests
    switch (type) {
      case 'daily':
        if (!date) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Date parameter required' })
          };
        }

        console.log(`Fetching daily puzzle for date: ${date}`);
        const dailyDoc = await db.collection('puzzles').doc(date).get();
        
        if (dailyDoc.exists) {
          const puzzleData = dailyDoc.data();
          console.log(`✓ Found puzzle: ${puzzleData.categories}`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(puzzleData)
          };
        } else {
          console.log(`No puzzle found for date: ${date}`);
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Puzzle not found' })
          };
        }

      case 'bonus':
        if (!bonusId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Bonus ID required' })
          };
        }

        console.log(`Fetching bonus puzzle: ${bonusId}`);
        const bonusDoc = await db.collection('bonusPuzzles').doc(bonusId).get();
        
        if (bonusDoc.exists) {
          const bonusData = bonusDoc.data();
          // Check if expired
          if (bonusData.expiry && new Date(bonusData.expiry) < new Date()) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: 'Puzzle expired' })
            };
          }
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(bonusData)
          };
        } else {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Bonus puzzle not found' })
          };
        }

      case 'custom':
        // Handle custom puzzle saves
        if (event.httpMethod === 'POST') {
          const puzzleData = JSON.parse(event.body);
          const docRef = await db.collection('customPuzzles').add({
            ...puzzleData,
            created: admin.firestore.FieldValue.serverTimestamp()
          });
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ id: docRef.id })
          };
        }
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid request type' })
        };
    }

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};