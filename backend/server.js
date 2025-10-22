const express = require('express');
const cors = require('cors');
const path = require('path');
const YTDownloader = require('./downloader');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const downloader = new YTDownloader();

// API Routes
app.post('/api/analyze', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        const result = await downloader.analyze(url);
        res.json(result);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze video: ' + error.message });
    }
});

app.post('/api/convert', async (req, res) => {
    try {
        const { youtubeUrl, title, id, ext, note, format } = req.body;
        
        if (!id) {
            return res.status(400).json({ error: 'Conversion ID is required' });
        }

        const result = await downloader.convert({
            youtubeUrl,
            title,
            id,
            ext,
            note,
            format
        });
        
        res.json(result);
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Failed to convert video: ' + error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'YouTube Downloader API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API Health Check: http://localhost:${port}/api/health`);
});