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
exports.handler = async (event, context) => {
  // Handle CORS first
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Import Firebase Admin here to catch import errors
    const admin = require('firebase-admin');
    
    console.log('Environment variables check:');
    console.log('FIREBASE_PROJECT_ID:', !!process.env.FIREBASE_PROJECT_ID);
    console.log('FIREBASE_CLIENT_EMAIL:', !!process.env.FIREBASE_CLIENT_EMAIL);
    console.log('FIREBASE_PRIVATE_KEY:', !!process.env.FIREBASE_PRIVATE_KEY);
    
    // Initialize Firebase Admin (only once)
    if (!admin.apps.length) {
      console.log('Initializing Firebase Admin...');
      
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  };
      
      // Validate required environment variables
      if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
        throw new Error('Missing required Firebase environment variables');
      }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
      
      console.log('Firebase Admin initialized successfully');
    }
    
    const db = admin.firestore();
    console.log('Firestore instance created');

    console.log('Function called with:', event.httpMethod, event.queryStringParameters);
    
    const { type, date, bonusId } = event.queryStringParameters || {};

    if (type === 'daily' && date) {
      console.log('Fetching daily puzzle for date:', date);
      
      const docRef = db.collection('puzzles').doc(date);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log('No puzzle found for date:', date);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Puzzle not found for this date' })
        };
      }
      
      const puzzleData = doc.data();
      console.log('Puzzle data found:', puzzleData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(puzzleData)
      };
    }

    if (type === 'bonus' && bonusId) {
      console.log('Fetching bonus puzzle:', bonusId);
      
      const docRef = db.collection('bonusPuzzles').doc(bonusId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.log('No bonus puzzle found:', bonusId);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Bonus puzzle not found' })
        };
      }
      
      const puzzleData = doc.data();
      console.log('Bonus puzzle data found:', puzzleData);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(puzzleData)
      };
    }

    if (type === 'custom' && event.httpMethod === 'POST') {
      console.log('Saving custom puzzle');
      
      const puzzleData = JSON.parse(event.body);
      const docRef = await db.collection('customPuzzles').add({
        ...puzzleData,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('Custom puzzle saved with ID:', docRef.id);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ id: docRef.id })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid request parameters' })
    };

  } catch (error) {
    console.error('Function error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
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