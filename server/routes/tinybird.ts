import { RequestHandler } from "express";

const TINYBIRD_TOKEN = "p.eyJ1IjogIjMyMTdkNmJmLWM0ZDQtNDY0My1hYTBhLTQxY2Q3ODJlY2U0ZCIsICJpZCI6ICJhNzAwYzQ2Ni03MTMwLTRkZmMtYTMzNS0yOGYyMDA1ZTRlNjgiLCAiaG9zdCI6ICJ1cy1lYXN0LWF3cyJ9.8UMc_OIkIwtVWUnsYOgs-aiO61hY5Rl-bDsOoLe9Rwc";
const TINYBIRD_BASE_URL = "https://api.us-east-aws.tinybird.co/v0/pipes";

export const handleTinybirdProxy: RequestHandler = async (req, res) => {
  try {
    const { pipeName } = req.params;
    const queryParams = req.query;

    // Validate pipe name to prevent injection
    const allowedPipes = [
      'order_details_mv',
      'inventory_health_check_mv', 
      'returns_details_mv',
      'inbound_shipments_details_mv',
      'order_shipments_mv',
      'product_details_mv'
    ];

    if (!allowedPipes.includes(pipeName)) {
      return res.status(400).json({ error: 'Invalid pipe name' });
    }

    // Build URL with query parameters
    const url = new URL(`${TINYBIRD_BASE_URL}/${pipeName}.json`);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    // Make request to Tinybird
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TINYBIRD_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Tinybird API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(data);
  } catch (error) {
    console.error('Tinybird proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from Tinybird',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
