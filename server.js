const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Ordered list of airports
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
    
    // Map code to airport info
    const codeToAirport = {};
    airportList.forEach(apt => {
      codeToAirport[apt.code] = apt;
    });

    const results = [];
    const seenCodes = new Set();

    lines.forEach(line => {
      // Match ICAO code at the very start
      const codeMatch = line.match(/^([A-Z]{4})\s/);
      if (!codeMatch) return;

      const code = codeMatch[1];
      if (!codeToAirport[code] || seenCodes.has(code)) return;

      seenCodes.add(code);

      // Extract temperature: look for \s(M?\d{2})\/  (first number before / in temp/dewpoint)
      const tempMatch = line.match(/\s(M?\d{2})\/\s*(M?\d{2})/);
      let tempC = null;
      if (tempMatch) {
        tempC = parseInt(tempMatch[1].replace('M', '-'), 10);
      }

      results.push({
        code,
        name: codeToAirport[code].name,
        tempC,
        tempF: tempC !== null ? Math.round((tempC * 9/5) + 32) : null,
        rawMetar: line.trim()
      });
    });

    // Fill in missing airports with N/A
    airportList.forEach(apt => {
      if (!seenCodes.has(apt.code)) {
        results.push({
          code: apt.code,
          name: apt.name,
          tempC: null,
          tempF: null,
          rawMetar: 'No METAR available'
        });
      }
    });

    // Preserve original order
    const orderedResults = airportList.map(apt => 
      results.find(r => r.code === apt.code) || {
        code: apt.code,
        name: apt.name,
        tempC: null,
        tempF: null,
        rawMetar: 'No data'
      }
    );

    res.json({ 
      airports: orderedResults,
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
