const admin = require('firebase-admin');

// Initialize Firebase Admin (singleton pattern)
if (!admin.apps.length) {
  try {
    // Handle the private key properly - it might be base64 encoded or have escaped newlines
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!privateKey) {
      throw new Error('FIREBASE_PRIVATE_KEY environment variable is missing');
    }
    
    // Try to decode if it's base64 encoded
    try {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf8');
    } catch (e) {
      // If base64 decode fails, use as-is
    }
    
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    console.log('🔧 Firebase private key length:', privateKey.length);
    console.log('🔧 Firebase project ID:', process.env.FIREBASE_PROJECT_ID);
    console.log('🔧 Firebase client email:', process.env.FIREBASE_CLIENT_EMAIL);
    
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: "dummy", // This can be dummy for service account keys
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: "dummy", // This can be dummy
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    throw error;
  }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { type, date, bonusId } = event.queryStringParameters || {};
    
    console.log('🔍 Puzzle function called with:', { type, date, bonusId, method: event.httpMethod });

    if (type === 'daily' && date) {
      // Get daily puzzle
      console.log(`📅 Fetching daily puzzle for date: ${date}`);
      
      try {
        const doc = await db.collection('puzzles').doc(date).get();
        
        if (!doc.exists) {
          console.log(`📅 No puzzle found for date: ${date}`);
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
              error: 'Puzzle not found',
              message: `No puzzle available for ${date}`
            })
          };
        }
        
        const puzzleData = doc.data();
        console.log(`✅ Found daily puzzle:`, puzzleData.categories);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(puzzleData)
        };
        
      } catch (firestoreError) {
        console.error('❌ Firestore error:', firestoreError);
        throw new Error(`Firestore error: ${firestoreError.message}`);
      }
      
    } else if (type === 'bonus' && bonusId) {
      // Get bonus puzzle
      console.log(`🎁 Fetching bonus puzzle: ${bonusId}`);
      
      try {
        const doc = await db.collection('bonusPuzzles').doc(bonusId).get();
        
        if (!doc.exists) {
          console.log(`🎁 No bonus puzzle found: ${bonusId}`);
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ 
              error: 'Bonus puzzle not found',
              message: `No bonus puzzle available with ID ${bonusId}`
            })
          };
        }
        
        const puzzleData = doc.data();
        console.log(`✅ Found bonus puzzle:`, puzzleData.categories);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(puzzleData)
        };
        
      } catch (firestoreError) {
        console.error('❌ Firestore error:', firestoreError);
        throw new Error(`Firestore error: ${firestoreError.message}`);
      }
      
    } else if (type === 'custom' && event.httpMethod === 'POST') {
      // Save custom puzzle
      console.log('💾 Saving custom puzzle');
      
      try {
        const puzzleData = JSON.parse(event.body);
        console.log('📝 Custom puzzle data:', puzzleData);
        
        const docRef = await db.collection('customPuzzles').add({
          ...puzzleData,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Custom puzzle saved with ID: ${docRef.id}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            success: true, 
            id: docRef.id 
          })
        };
        
      } catch (saveError) {
        console.error('❌ Error saving custom puzzle:', saveError);
        throw new Error(`Save error: ${saveError.message}`);
      }
      
    } else {
      // Invalid request
      console.log('❌ Invalid request parameters:', { type, date, bonusId, method: event.httpMethod });
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request',
          message: 'Please provide valid type (daily/bonus/custom) and required parameters',
          received: { type, date, bonusId, method: event.httpMethod }
        })
      };
    }
    
  } catch (error) {
    console.error('❌ Function error:', error);
    console.error('❌ Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};