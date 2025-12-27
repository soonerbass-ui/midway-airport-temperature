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
    const apiUrl = `https://aviationweather.gov/api/data/metar?ids=${ids}&hours=6&format=raw`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const text = await response.text();
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    const codeToAirport = {};
    airportList.forEach(apt => codeToAirport[apt.code] = apt);

    const resultsMap = {};

    lines.forEach(line => {
      const codeMatch = line.match(/(?:SPECI|METAR)\s*([A-Z]{4})\s/);
      if (!codeMatch) return;

      const code = codeMatch[1];
      if (!codeToAirport[code]) return;

      const tempMatch = line.match(/(M?\d{2})\/(M?\d{2})/);
      let tempC = null;
      if (tempMatch) {
        tempC = parseInt(tempMatch[1].replace('M', '-'), 10);
      }

      if (!resultsMap[code]) resultsMap[code] = { reports: [] };
      resultsMap[code].reports.push({ tempC, raw: line.trim() });
    });

    const orderedResults = airportList.map(apt => {
      const station = resultsMap[apt.code];
      if (!station || station.reports.length === 0) {
        return {
          code: apt.code,
          name: apt.name,
          tempC: null,
          tempF: null,
          trend: '—',
          rawMetar: 'No METAR available'
        };
      }

      // Sort by timestamp (most recent first) - format is YYMMDDHHMMZ
      station.reports.sort((a, b) => {
        const timeA = a.raw.match(/\d{6}Z/);
        const timeB = b.raw.match(/\d{6}Z/);
        if (!timeA || !timeB) return 0;
        return timeB[0].localeCompare(timeA[0]); // Reverse for most recent first
      });

      const latest = station.reports[0];
      const previous = station.reports.length > 1 ? station.reports[1] : null;

      let trend = '—';
      if (previous && latest.tempC !== null && previous.tempC !== null) {
        if (latest.tempC > previous.tempC) trend = '🔴';
        else if (latest.tempC < previous.tempC) trend = '🔵';
      }

      return {
        code: apt.code,
        name: apt.name,
        tempC: latest.tempC,
        tempF: latest.tempC !== null ? Math.round((latest.tempC * 9/5) + 32) : null,
        trend,
        rawMetar: latest.raw
      };
    });

    res.json({ 
      airports: orderedResults,
      updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch METAR data' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
