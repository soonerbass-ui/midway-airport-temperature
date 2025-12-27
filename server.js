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
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    const codeToAirport = {};
    airportList.forEach(apt => codeToAirport[apt.code] = apt);

    const resultsMap = {};

    lines.forEach(line => {
      // Extract ICAO code: first 4 letters after possible "SPECI " or "METAR "
      const codeMatch = line.match(/(?:SPECI|METAR)\s*([A-Z]{4})\s/);
      if (!codeMatch) return;

      const code = codeMatch[1];
      if (!codeToAirport[code]) return;

      // Extract air temperature: (M?\d{2})\/(M?\d{2}) 
      const tempMatch = line.match(/(M?\d{2})\/(M?\d{2})/);
      let tempC = null;
      if (tempMatch) {
        const tempStr = tempMatch[1];
        tempC = parseInt(tempStr.replace('M', '-'), 10);
      }

      resultsMap[code] = {
        code,
        name: codeToAirport[code].name,
        tempC,
        tempF: tempC !== null ? Math.round((tempC * 9/5) + 32) : null,
        rawMetar: line.trim()
      };
    });

    // Order by original list
    const orderedResults = airportList.map(apt => {
      return resultsMap[apt.code] || {
        code: apt.code,
        name: apt.name,
        tempC: null,
        tempF: null,
        rawMetar: 'No METAR available'
      };
    });

    res.json({ 
      airports: orderedResults,
      updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
