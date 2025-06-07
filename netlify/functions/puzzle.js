const admin = require('firebase-admin');

// Initialize Firebase Admin (singleton pattern)
if (!admin.apps.length) {
  try {
    console.log('🔧 Initializing Firebase Admin with individual variables...');
    
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required Firebase environment variables');
    }
    
    console.log('🔧 Project ID:', projectId);
    console.log('🔧 Client email:', clientEmail);
    console.log('🔧 Private key length:', privateKey.length);
    
    // Clean up the private key format
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Ensure proper PEM format
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      privateKey = '-----BEGIN PRIVATE KEY-----\n' + privateKey;
    }
    if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
      privateKey = privateKey + '\n-----END PRIVATE KEY-----';
    }
    
    console.log('🔧 Private key starts correctly:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
    console.log('🔧 Private key ends correctly:', privateKey.endsWith('-----END PRIVATE KEY-----'));

    const serviceAccount = {
      type: "service_account",
      project_id: projectId,
      private_key_id: "dummy",
      private_key: privateKey,
      client_email: clientEmail,
      client_id: "dummy",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(clientEmail)}`
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    console.error('❌ Full error:', error);
    throw error;
  }
}

const db = admin.firestore();

exports.handler = async (event, context) => {
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
    const { type, date, bonusId } = event.queryStringParameters || {};
    
    console.log('🔍 Puzzle function called:', { type, date, bonusId, method: event.httpMethod });

    if (type === 'daily' && date) {
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
        console.log(`✅ Found daily puzzle:`, puzzleData?.categories || 'No categories');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(puzzleData)
        };
        
      } catch (firestoreError) {
        console.error('❌ Firestore error:', firestoreError.message);
        console.error('❌ Firestore error code:', firestoreError.code);
        throw new Error(`Firestore error: ${firestoreError.message}`);
      }
      
    } else if (type === 'bonus' && bonusId) {
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
        console.log(`✅ Found bonus puzzle:`, puzzleData?.categories || 'No categories');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(puzzleData)
        };
        
      } catch (firestoreError) {
        console.error('❌ Firestore error:', firestoreError.message);
        throw new Error(`Firestore error: ${firestoreError.message}`);
      }
      
    } else if (type === 'custom' && event.httpMethod === 'POST') {
      console.log('💾 Saving custom puzzle');
      
      try {
        const puzzleData = JSON.parse(event.body);
        console.log('📝 Custom puzzle data:', puzzleData?.categories || 'No categories');
        
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
        console.error('❌ Error saving custom puzzle:', saveError.message);
        throw new Error(`Save error: ${saveError.message}`);
      }
      
    } else {
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
    console.error('❌ Function error:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        type: error.constructor.name
      })
    };
  }
};