const axios = require('axios');
const qs = require('qs');
const cheerio = require('cheerio');

class YTDownloader {
    constructor() {
        this.baseUrl = 'https://yt1d.com';
    }

    async bypass() {
        // Simplified bypass - in production you might need to implement the actual turnstile
        return Math.random().toString(36).substring(2) + Date.now();
    }

    async analyze(youtubeUrl) {  
        const token = await this.bypass();  
        const data = qs.stringify({  
            'url': youtubeUrl,  
            'ajax': '1',  
            'lang': 'en',  
            'cftoken': token  
        });  
            
        const config = {  
            method: 'POST',  
            url: 'https://yt1d.com/mates/en/analyze/ajax?retry=undefined&platform=youtube&mhash=2eb5f4c999fea86c',  
            headers: {  
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',  
                'Accept': 'application/json, text/javascript, */*; q=0.01',  
                'Content-Type': 'application/x-www-form-urlencoded',  
                'origin': 'https://yt1d.com',  
                'referer': 'https://yt1d.com/en307/'  
            },  
            data: data  
        };  
            
        try {  
            const api = await axios.request(config);  
            const html = api.data.result;  
            if (api.data.status !== 'success' || !html) {  
                throw new Error('Failed to get data or HTML result is empty');  
            }  

            const $ = cheerio.load(html);  

            const videoTitle = $('#video_title').text().trim();  
            const result = {  
                video_title: videoTitle,  
                thumbnail: $('.img-thumbnail').attr('src'),  
                downloads: []  
            };  

            $('table.table tr').each((index, element) => {  
                const tds = $(element).find('td');  
                if (tds.length !== 3) return;  

                const quality = $(tds[0]).text().trim().replace(/\s+/g, ' ');  
                const size = $(tds[1]).text().trim();  
                const linkElement = $(tds[2]).find('a, button');  
                const directUrl = linkElement.attr('href');  

                if (directUrl && directUrl.includes('googlevideo.com')) {  
                    result.downloads.push({  
                        type: 'direct',  
                        quality: quality,  
                        size: size,  
                        has_audio: !$(element).hasClass('noaudio'),  
                        url: directUrl  
                    });  
                } else {  
                    const onclickAttr = linkElement.attr('onclick');  
                    if (onclickAttr && onclickAttr.startsWith('download')) {  
                        const match = onclickAttr.match(/download'([^']*)','([^']*)','([^']*)','([^']*)',([^,]*),'([^']*)','([^']*)'/);  
                        if (match) {  
                            result.downloads.push({  
                                type: 'conversion',  
                                quality: quality,  
                                size: size,  
                                has_audio: !$(element).hasClass('noaudio'),  
                                conversion_params: {  
                                    youtubeUrl: match[1],  
                                    title: videoTitle,  
                                    id: match[3],  
                                    ext: match[4],  
                                    note: match[6],  
                                    format: match[7]  
                                }  
                            });  
                        }  
                    }  
                }  
            });  

            return result;  

        } catch (e) {  
            console.error('Error during analysis:', e.message);  
            throw e;  
        }  
    }  

    async convert(options) {  
        const { youtubeUrl, title, id, ext, note, format } = options;  
        if (!id) throw new Error('Missing ID for conversion.');  

        let data = qs.stringify({ platform: 'youtube', url: youtubeUrl, title, id, ext, note, format });  
        let config = {  
            method: 'POST',  
            url: `https://yt1d.com/mates/en/convert?id=${id}`,  
            headers: {  
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',  
                'Accept': 'application/json, text/javascript, */*; q=0.01',  
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',  
                'x-note': note,  
                'platform': 'youtube',  
                'origin': 'https://yt1d.com',  
                'referer': 'https://yt1d.com/en307/',  
            },  
            data: data  
        };  

        try {  
            const response = await axios.request(config);  
            return response.data;  
        } catch (e) {  
            console.error('Error during conversion:', e.message);  
            throw e;  
        }  
    }
}

module.exports = YTDownloader;