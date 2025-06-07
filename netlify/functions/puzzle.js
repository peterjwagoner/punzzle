// Alternative approach using Firebase REST API instead of Admin SDK
// This bypasses the private key authentication issues

const FIREBASE_PROJECT_ID = 'punzzle';
const FIREBASE_DATABASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

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
    
    console.log('🔍 Puzzle function called (REST API):', { type, date, bonusId, method: event.httpMethod });

    if (type === 'daily' && date) {
      console.log(`📅 Fetching daily puzzle for date: ${date}`);
      
      try {
        // Use Firebase REST API to get document
        const url = `${FIREBASE_DATABASE_URL}/puzzles/${date}`;
        console.log('🌐 REST API URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          if (response.status === 404) {
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
          throw new Error(`Firebase REST API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert Firestore document format to simple object
        const puzzleData = convertFirestoreDocument(data);
        
        console.log(`✅ Found daily puzzle via REST API:`, puzzleData?.categories || 'No categories');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(puzzleData)
        };
        
      } catch (apiError) {
        console.error('❌ Firebase REST API error:', apiError.message);
        throw new Error(`Firebase REST API error: ${apiError.message}`);
      }
      
    } else if (type === 'bonus' && bonusId) {
      console.log(`🎁 Fetching bonus puzzle: ${bonusId}`);
      
      try {
        const url = `${FIREBASE_DATABASE_URL}/bonusPuzzles/${bonusId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          if (response.status === 404) {
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
          throw new Error(`Firebase REST API error: ${response.status}`);
        }
        
        const data = await response.json();
        const puzzleData = convertFirestoreDocument(data);
        
        console.log(`✅ Found bonus puzzle via REST API:`, puzzleData?.categories || 'No categories');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(puzzleData)
        };
        
      } catch (apiError) {
        console.error('❌ Firebase REST API error:', apiError.message);
        throw new Error(`Firebase REST API error: ${apiError.message}`);
      }
      
    } else {
      console.log('❌ Invalid request parameters:', { type, date, bonusId, method: event.httpMethod });
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid request',
          message: 'Please provide valid type (daily/bonus) and required parameters',
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

// Helper function to convert Firestore document format to simple object
function convertFirestoreDocument(firestoreDoc) {
  if (!firestoreDoc.fields) {
    return null;
  }
  
  const result = {};
  
  for (const [key, valueObj] of Object.entries(firestoreDoc.fields)) {
    if (valueObj.stringValue !== undefined) {
      result[key] = valueObj.stringValue;
    } else if (valueObj.arrayValue && valueObj.arrayValue.values) {
      result[key] = valueObj.arrayValue.values.map(v => v.stringValue);
    } else if (valueObj.integerValue !== undefined) {
      result[key] = parseInt(valueObj.integerValue);
    } else if (valueObj.timestampValue !== undefined) {
      result[key] = valueObj.timestampValue;
    }
  }
  
  return result;
}