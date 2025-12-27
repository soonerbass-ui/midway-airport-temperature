const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// List of airports in your order
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
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    // Each line is a raw METAR for one station
    const results = lines.map(line => {
      // Find the station code (first 4 letters after possible leading text)
      const codeMatch = line.match(/([A-Z]{4})\s/);
      const code = codeMatch ? codeMatch[1] : 'UNKNOWN';
      
      // Find temperature: \d{2}/ or M\d{2}/ (M = minus)
      const tempMatch = line.match(/\s(M?\d{2})\/(M?\d{2})\s/);
      let tempC = null;
      if (tempMatch) {
        tempC = parseInt(tempMatch[1].replace('M', '-'), 10);
      }
      
      const name = airportList.find(a => a.code === code)?.name || code;
      
      return {
        code,
        name,
        tempC,
        tempF: tempC !== null ? Math.round((tempC * 9/5) + 32) : null,
        rawMetar: line.trim()
      };
    });

    res.json({ 
      airports: results,
      updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch or parse METAR data' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
