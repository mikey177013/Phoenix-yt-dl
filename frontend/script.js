class PhoenixYTDownloader {
    constructor() {
        this.apiBase = 'https://phoenix-yt-dl.onrender.com/api';
        this.currentFilter = 'all';
        this.initializeEventListeners();
        this.checkServerStatus();
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiBase}/health`);
            const data = await response.json();
            console.log('Server status:', data);
        } catch (error) {
            console.log('Server health check failed:', error.message);
        }
    }

    initializeEventListeners() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        const urlInput = document.getElementById('youtubeUrl');
        const filterBtns = document.querySelectorAll('.filter-btn');

        analyzeBtn.addEventListener('click', () => this.analyzeVideo());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.analyzeVideo();
            }
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.filterDownloads();
            });
        });

        urlInput.addEventListener('input', () => {
            this.hideResult();
            this.hideError();
        });
    }

    async analyzeVideo() {
        const url = document.getElementById('youtubeUrl').value.trim();
        
        if (!url) {
            this.showError('Please enter a YouTube URL');
            return;
        }

        if (!this.isValidYouTubeUrl(url)) {
            this.showError('Please enter a valid YouTube URL. Example: https://www.youtube.com/watch?v=VIDEO_ID');
            return;
        }

        this.showLoading();
        this.hideError();
        this.hideResult();

        try {
            console.log('Sending request to analyze:', url);
            const response = await fetch(`${this.apiBase}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const data = await response.json();
            console.log('Analysis response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Failed to analyze video');
            }

            if (!data.downloads || data.downloads.length === 0) {
                throw new Error('No download options available for this video');
            }

            this.displayResult(data);
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError(error.message || 'An unexpected error occurred. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    isValidYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/(watch\?v=|embed\/|v\/|shorts\/|playlist\?|.*[?&]v=)?([^#&?]*).*/;
        return youtubeRegex.test(url);
    }

    displayResult(data) {
        const resultElement = document.getElementById('result');
        const videoTitle = document.getElementById('videoTitle');
        const thumbnail = document.getElementById('thumbnail');
        const downloadsList = document.getElementById('downloadsList');
        const downloadCount = document.getElementById('downloadCount');

        videoTitle.textContent = data.video_title || 'Untitled Video';
        
        if (data.thumbnail) {
            thumbnail.src = data.thumbnail;
            thumbnail.style.display = 'block';
        } else {
            thumbnail.style.display = 'none';
        }

        downloadCount.textContent = data.downloads.length;
        downloadsList.innerHTML = '';

        this.allDownloads = data.downloads;
        this.filterDownloads();
        this.showResult();
    }

    filterDownloads() {
        const downloadsList = document.getElementById('downloadsList');
        downloadsList.innerHTML = '';

        const filteredDownloads = this.allDownloads.filter(download => {
            switch (this.currentFilter) {
                case 'audio':
                    return download.has_audio;
                case 'video':
                    return !download.has_audio;
                default:
                    return true;
            }
        });

        if (filteredDownloads.length === 0) {
            downloadsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No downloads found for the selected filter</p>
                </div>
            `;
            return;
        }

        filteredDownloads.forEach(download => {
            const downloadItem = this.createDownloadItem(download);
            downloadsList.appendChild(downloadItem);
        });
    }

    createDownloadItem(download) {
        const item = document.createElement('div');
        item.className = 'download-item';

        const downloadInfo = document.createElement('div');
        downloadInfo.className = 'download-info';

        const quality = document.createElement('div');
        quality.className = 'quality';
        quality.innerHTML = `
            ${download.quality}
            <span class="${download.has_audio ? 'audio-badge' : 'no-audio-badge'}">
                <i class="fas fa-${download.has_audio ? 'volume-up' : 'video'}"></i>
                ${download.has_audio ? 'With Audio' : 'Video Only'}
            </span>
        `;

        const size = document.createElement('div');
        size.className = 'size';
        size.textContent = `Size: ${download.size || 'Unknown'}`;

        downloadInfo.appendChild(quality);
        downloadInfo.appendChild(size);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = `
            <i class="fas fa-download"></i>
            Download
        `;

        // Add data attributes for debugging
        downloadBtn.setAttribute('data-type', download.type);
        downloadBtn.setAttribute('data-quality', download.quality);

        if (download.type === 'direct') {
            downloadBtn.addEventListener('click', () => {
                console.log('Direct download clicked:', download);
                this.downloadFile(download.url, download.quality, 'direct');
            });
        } else {
            downloadBtn.addEventListener('click', () => {
                console.log('Conversion download clicked:', download);
                this.convertAndDownload(download);
            });
        }

        item.appendChild(downloadInfo);
        item.appendChild(downloadBtn);

        return item;
    }

    async convertAndDownload(download) {
        const downloadBtn = event.target.closest('.download-btn');
        const originalHTML = downloadBtn.innerHTML;
        
        try {
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Converting...';
            downloadBtn.classList.add('converting');
            downloadBtn.disabled = true;

            console.log('Starting conversion:', download.conversion_params);

            const response = await fetch(`${this.apiBase}/convert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    youtubeUrl: download.conversion_params.youtubeUrl,
                    title: download.conversion_params.title,
                    id: download.conversion_params.id,
                    ext: download.conversion_params.ext,
                    note: download.conversion_params.note,
                    format: download.conversion_params.format
                })
            });

            const data = await response.json();
            console.log('Conversion response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Conversion failed');
            }

            if (data.url) {
                this.downloadFile(data.url, download.quality, 'converted');
            } else if (data.result) {
                // Some APIs return the URL in data.result
                this.downloadFile(data.result, download.quality, 'converted');
            } else {
                throw new Error('No download URL received from conversion');
            }
        } catch (error) {
            console.error('Conversion error:', error);
            this.showError('Conversion failed: ' + error.message);
        } finally {
            downloadBtn.innerHTML = originalHTML;
            downloadBtn.classList.remove('converting');
            downloadBtn.disabled = false;
        }
    }

    downloadFile(url, quality, type = 'direct') {
        console.log('Downloading file:', { url, quality, type });
        
        // Check if URL is valid
        if (!url || !url.startsWith('http')) {
            this.showError('Invalid download URL. Please try another quality option.');
            return;
        }

        try {
            // Method 1: Direct download with suggested filename
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // Get video title for filename
            const videoTitle = document.getElementById('videoTitle').textContent;
            const filename = this.sanitizeFilename(`${videoTitle} - ${quality}`);
            
            // Try to set download attribute (may not work for cross-origin URLs)
            link.download = filename;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success message
            this.showTempMessage('Download started! Check your browser downloads.', 'success');

            // Fallback: If direct download doesn't work, open in new tab
            setTimeout(() => {
                window.open(url, '_blank');
            }, 1000);

        } catch (error) {
            console.error('Download error:', error);
            // Fallback: Open in new tab
            window.open(url, '_blank');
            this.showTempMessage('Opening download in new tab...', 'info');
        }
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9áéíóúñü \.-]/gi, '_')
            .replace(/\s+/g, '_')
            .substring(0, 100) + '.mp4';
    }

    showTempMessage(message, type = 'info') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.temp-message');
        existingMessages.forEach(msg => msg.remove());

        const messageEl = document.createElement('div');
        messageEl.className = `temp-message temp-message-${type}`;
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
            word-wrap: break-word;
        `;

        document.body.appendChild(messageEl);

        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => messageEl.remove(), 300);
            }
        }, 4000);
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorElement.classList.remove('hidden');
        this.hideLoading();
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }

    showResult() {
        document.getElementById('result').classList.remove('hidden');
    }

    hideResult() {
        document.getElementById('result').classList.add('hidden');
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.downloader = new PhoenixYTDownloader();
    console.log('Phoenix YT Downloader initialized');
});

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .no-results {
        text-align: center;
        padding: 40px;
        color: var(--gray);
    }
    
    .no-results i {
        font-size: 3rem;
        margin-bottom: 15px;
        opacity: 0.5;
    }
    
    /* Debug info styling */
    .debug-info {
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        margin: 10px 0;
    }
`;
document.head.appendChild(style);