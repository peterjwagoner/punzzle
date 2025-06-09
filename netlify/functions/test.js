exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    },
    body: 'Hello from Netlify Functions! Functions are working.'
  };
};