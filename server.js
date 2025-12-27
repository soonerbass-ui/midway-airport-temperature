const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const airportList = [
  { code: 'KLAX', name: 'Los Angeles (LAX)' },
  { code: 'KORD', name: 'Chicago (ORD)' },
  { code: 'KMIA', name: 'Miami (MIA)' },
  { code: 'KAUS', name: 'Austin (AUS)' },
  { code: 'KIAH', name: 'Houston (IAH)' },
  { code: 'KSFO', name: 'San Francisco (SFO)' },
  { code: 'KSEA', name: 'Seattle (SEA)' },
  { code: 'KDEN', name: 'Denver (DEN)' },
  { code: 'KJFK', name: 'New York (JFK)' },
  { code: 'KDFW', name: 'Dallas (DFW)' }
];

app.get('/api/temps', async (req, res) => {
  try {
    const ids = airportList.map(a => a.code).join(',');
    const apiUrl = `https://aviationweather.gov/api/data/metar?ids=${ids}&format=raw`;
    
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Midway-Temp-App/1.0' } // Helps avoid blocks
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const text = await response.text();
    
    // Debug: return the raw API response in JSON for testing
    res.json({ 
      debug_raw_text: text, 
      line_count: text.split('\n').length,
      airports: [], // empty for now
      updated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
