export default async (request, context) => {
  const url = new URL(request.url);
  const puzzleParam = url.searchParams.get('puzzle');
  
  if (!puzzleParam) {
    return;
  }
  
  const response = await context.next();
  const html = await response.text();
  
  try {
    const puzzleData = JSON.parse(atob(puzzleParam));
    
    const toTitleCase = (str) => {
      return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
    };
    
    const titleCaseCategories = toTitleCase(puzzleData.categories);
    
    // Make sure to include "Punzzle: " at the start
    const customTitle = `Punzzle: ${titleCaseCategories}`;
    const customDescription = `Punzzle: ${titleCaseCategories}. Can you solve this custom Punzzle?`;
    
    console.log('Custom title:', customTitle); // Debug log
    
    let modifiedHtml = html
      .replace(
        /<meta property="og:title" content="[^"]*">/,
        `<meta property="og:title" content="${customTitle}">`
      )
      .replace(
        /<meta name="twitter:title" content="[^"]*">/,
        `<meta name="twitter:title" content="${customTitle}">`
      )
      .replace(
        /<meta name="description" content="[^"]*">/,
        `<meta name="description" content="${customDescription}">`
      )
      .replace(
        /<meta property="og:description" content="[^"]*">/,
        `<meta property="og:description" content="${customDescription}">`
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
    console.error('Edge function error:', e);
    return response;
  }
};

export const config = {
  path: "/"
};