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
    const results = [];

    for (const apt of airportList) {
      const stationId = apt.code; // ICAO codes work as station IDs
      const url = `https://api.weather.gov/stations/${stationId}/observations/latest`;

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Midway-Temp-App/1.0 (your-email@example.com)' } // Required by NWS API
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const props = data.properties || {};

        const tempC = props.temperature ? props.temperature.value : null;
        const tempF = tempC !== null ? Math.round((tempC * 9/5) + 32) : null;

        results.push({
          code: apt.code,
          name: apt.name,
          tempC: tempC,
          tempF: tempF,
          trend: '—', // No history in this API (can add later if needed)
          rawObservation: props // Full data for debugging
        });
      } catch (err) {
        results.push({
          code: apt.code,
          name: apt.name,
          tempC: null,
          tempF: null,
          trend: '—',
          rawObservation: 'Error fetching data'
        });
      }
    }

    res.json({ 
      airports: results,
      updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch observation data' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
