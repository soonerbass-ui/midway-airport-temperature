const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/api/temps', async (req, res) => {
  try {
    const apiUrl = 'https://aviationweather.gov/api/data/metar?ids=KLAX,KORD,KMIA,KAUS,KIAH,KSFO,KSEA,KDEN,KJFK,KDFW&format=json';
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const airports = {
      'KLAX': 'Los Angeles (LAX)',
      'KORD': 'Chicago (ORD)',
      'KMIA': 'Miami (MIA)',
      'KAUS': 'Austin (AUS)',
      'KIAH': 'Houston (IAH)',
      'KSFO': 'San Francisco (SFO)',
      'KSEA': 'Seattle (SEA)',
      'KDEN': 'Denver (DEN)',
      'KJFK': 'New York (JFK)',
      'KDFW': 'Dallas (DFW)'
    };

    const results = Object.keys(airports).map(code => {
      const station = data[code] || {};
      const tempC = station.temp_c !== undefined ? parseFloat(station.temp_c) : null;
      return {
        code,
        name: airports[code],
        tempC,
        tempF: tempC !== null ? Math.round((tempC * 9/5) + 32) : null,
        obsTime: station.obs_time || null
      };
    });

    res.json({ 
      airports: results,
      updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch airport temperatures' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
