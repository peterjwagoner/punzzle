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
      status