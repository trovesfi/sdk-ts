const puppeteer = require('puppeteer');

export async function getAPIUsingHeadlessBrowser(
    url: string
) {

  try {
    // Launch a headless browser
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set a realistic User-Agent to avoid suspicion
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Go to the API endpoint
    await page.goto(url, {
      waitUntil: 'networkidle2', // Wait until the page fully loads (including JS challenge)
    });

    // If the API returns JSON, extract it
    const jsonData = await page.evaluate(() => {
      const pre = document.querySelector('pre'); // Adjust based on how the API response is formatted
      return pre && pre.textContent ? JSON.parse(pre.textContent) : null;
    });

    // Clean up
    await browser.close();
    return jsonData;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}
  