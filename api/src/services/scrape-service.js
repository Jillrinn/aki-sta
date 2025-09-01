const https = require('https');
const targetDatesRepository = require('../repositories/target-dates-repository');

class ScrapeService {
  constructor() {
    this.scraperApiUrl = process.env.SCRAPER_API_URL;
  }

  async triggerScraperApi(targetDates = []) {
    if (!this.scraperApiUrl) {
      throw new Error('SCRAPER_API_URL environment variable is not set');
    }

    return new Promise((resolve, reject) => {
      const url = new URL(this.scraperApiUrl);
      const postData = JSON.stringify({
        targetDates: targetDates,
        source: 'batch-api'
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/api/scrape',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        console.error('Error calling scraper API:', error);
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  async executeBatchScraping(source = 'logic-app') {
    try {
      const targetDates = await targetDatesRepository.getAllTargetDates();
      
      if (!targetDates || targetDates.length === 0) {
        return {
          success: false,
          message: '対象日付が設定されていません'
        };
      }

      const dateStrings = targetDates.map(td => td.date);
      
      // Fire and forget
      this.triggerScraperApi(dateStrings)
        .catch((error) => {
          console.error('Failed to trigger batch scraper API:', error);
        });

      return {
        success: true,
        message: 'スクレイピングを開始しました',
        targetDates: dateStrings
      };
      
    } catch (error) {
      console.error(`Failed to initiate batch scraping: ${error.message}`);
      
      return {
        success: false,
        message: 'スクレイピングの開始に失敗しました'
      };
    }
  }

  async executeSingleScraping() {
    try {
      // Fire and forget
      this.triggerScraperApi()
        .catch((error) => {
          console.error('Failed to trigger scraper API:', error);
        });

      return {
        success: true,
        message: 'スクレイピングを開始しました'
      };
      
    } catch (error) {
      console.error(`Failed to initiate scraping: ${error.message}`);
      
      return {
        success: false,
        message: 'スクレイピングの開始に失敗しました'
      };
    }
  }
}

module.exports = new ScrapeService();