exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const envCheck = {
      FIREBASE_PROJECT_ID: {
        exists: !!process.env.FIREBASE_PROJECT_ID,
        value: process.env.FIREBASE_PROJECT_ID || 'MISSING',
        length: process.env.FIREBASE_PROJECT_ID ? process.env.FIREBASE_PROJECT_ID.length : 0
      },
      FIREBASE_CLIENT_EMAIL: {
        exists: !!process.env.FIREBASE_CLIENT_EMAIL,
        value: process.env.FIREBASE_CLIENT_EMAIL || 'MISSING',
        length: process.env.FIREBASE_CLIENT_EMAIL ? process.env.FIREBASE_CLIENT_EMAIL.length : 0
      },
      FIREBASE_PRIVATE_KEY: {
        exists: !!process.env.FIREBASE_PRIVATE_KEY,
        length: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 0,
        startsWithBegin: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.startsWith('-----BEGIN') : false,
        endsWithEnd: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.endsWith('-----') : false,
        hasNewlines: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('\\n') : false,
        preview: process.env.FIREBASE_PRIVATE_KEY ? 
          process.env.FIREBASE_PRIVATE_KEY.substring(0, 50) + '...' : 'MISSING'
      }
    };

    // Try to decode the private key if it exists
    if (process.env.FIREBASE_PRIVATE_KEY) {
      try {
        // Test base64 decoding
        const decoded = Buffer.from(process.env.FIREBASE_PRIVATE_KEY, 'base64').toString('utf8');
        envCheck.FIREBASE_PRIVATE_KEY.canDecodeBase64 = true;
        envCheck.FIREBASE_PRIVATE_KEY.decodedStartsWithBegin = decoded.startsWith('-----BEGIN');
        envCheck.FIREBASE_PRIVATE_KEY.decodedLength = decoded.length;
      } catch (e) {
        envCheck.FIREBASE_PRIVATE_KEY.canDecodeBase64 = false;
        envCheck.FIREBASE_PRIVATE_KEY.base64Error = e.message;
      }

      // Test with escaped newlines replaced
      const withNewlines = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      envCheck.FIREBASE_PRIVATE_KEY.withNewlinesStartsWithBegin = withNewlines.startsWith('-----BEGIN');
      envCheck.FIREBASE_PRIVATE_KEY.withNewlinesLength = withNewlines.length;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'Environment check complete',
        timestamp: new Date().toISOString(),
        environment: envCheck,
        allPresent: envCheck.FIREBASE_PROJECT_ID.exists && 
                   envCheck.FIREBASE_CLIENT_EMAIL.exists && 
                   envCheck.FIREBASE_PRIVATE_KEY.exists
      }, null, 2)
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Environment check failed',
        message: error.message,
        stack: error.stack
      })
    };
  }
};