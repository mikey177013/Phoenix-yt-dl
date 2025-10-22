const express = require('express');
const cors = require('cors');
const YTDownloader = require('./downloader');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const downloader = new YTDownloader();

// API Routes
app.post('/api/analyze', async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({ error: 'YouTube URL is required' });
        }

        console.log('Analyzing URL:', url);
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

        console.log('Converting video:', { id, title, format });
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
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'YouTube Downloader API',
        endpoints: {
            health: 'GET /api/health',
            analyze: 'POST /api/analyze',
            convert: 'POST /api/convert'
        },
        usage: {
            analyze: {
                method: 'POST',
                url: '/api/analyze',
                body: { url: 'YouTube URL' }
            },
            convert: {
                method: 'POST',
                url: '/api/convert',
                body: {
                    youtubeUrl: 'string',
                    title: 'string',
                    id: 'string',
                    ext: 'string',
                    note: 'string',
                    format: 'string'
                }
            }
        }
    });
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
            'GET /',
            'GET /api/health',
            'POST /api/analyze',
            'POST /api/convert'
        ]
    });
});

app.listen(port, () => {
    console.log(`🚀 YouTube Downloader API running on port ${port}`);
    console.log(`📍 Health Check: http://localhost:${port}/api/health`);
    console.log(`📍 API Root: http://localhost:${port}/`);
});