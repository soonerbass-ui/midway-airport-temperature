const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/api/temp', async (req, res) => {
  try {
    const response = await fetch('https://aviationweather.gov/api/data/metar?ids=KMDW&format=raw');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n');
    const latestMetar = lines[lines.length - 1].trim(); // Most recent report

    // Extract temperature from METAR (e.g., "04/02" → temp 4°C)
    const tempMatch = latestMetar.match(/ (\d{2}|M\d{2})\/((\d{2}|M\d{2})) /);
    if (!tempMatch) {
      return res.status(404).json({ error: 'Temperature not found in METAR' });
    }

    let tempC = parseInt(tempMatch[1].replace('M', '-'), 10);
    res.json({ 
      temperature: tempC,
      rawMetar: latestMetar,
      updated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch METAR data' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});