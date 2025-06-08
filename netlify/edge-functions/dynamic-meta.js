export default async (request, context) => {
  const url = new URL(request.url);
  const puzzleParam = url.searchParams.get('puzzle');
  
  // Only modify responses for requests with a puzzle parameter
  if (!puzzleParam) {
    return;
  }
  
  // Get the original response
  const response = await context.next();
  const html = await response.text();
  
  try {
    // Decode the puzzle data
    const puzzleData = JSON.parse(atob(puzzleParam));
    
    // Function to convert to title case
    const toTitleCase = (str) => {
      return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    };
    
    // Convert categories to title case
    const titleCaseCategories = toTitleCase(puzzleData.categories);
    
    // Create the custom title and description
    const customTitle = `Punzzle: ${titleCaseCategories}`;
    const customDescription = `Can you solve this custom Punzzle? Categories: ${titleCaseCategories}. Find the pun that connects them!`;
    
    // Replace the meta tags in the HTML
    let modifiedHtml = html
      .replace(
        /<meta property="og:title" content="[^"]*">/,
        `<meta property="og:title" content="${customTitle}">`
      )
      .replace(
        /<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${customDescription}">`
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*">/,
        `<meta name="twitter:title" content="${customTitle}">`
      )
      .replace(
        /<meta name="twitter:description" content="[^"]*">/,
        `<meta name="twitter:description" content="${customDescription}">`
      )
      .replace(
        /<title>[^<]*<\/title>/,
        `<title>${customTitle}</title>`
      );
    
    return new Response(modifiedHtml, {
      headers: response.headers
    });
  } catch (e) {
    // If decoding fails, return the original response
    return response;
  }
};

export const config = {
  path: "/"
};