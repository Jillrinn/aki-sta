const https = require('https');
const http = require('http');
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
        dates: targetDates
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: '/scrape',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      // Use appropriate client based on protocol
      const client = url.protocol === 'https:' ? https : http;
      const req = client.request(options, (res) => {
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
          message: '練習日程が登録されていません'
        };
      }

      const dateStrings = targetDates.map(td => td.date);
      
      // Scraperのレスポンスを待つ
      const scraperResponse = await this.triggerScraperApi(dateStrings);
      
      // Scraperのレスポンスを解析
      let responseData;
      try {
        responseData = JSON.parse(scraperResponse.data);
      } catch (parseError) {
        console.error('Failed to parse scraper response:', parseError);
        return {
          success: false,
          message: '空き状況取得は実行中の可能性があります'
        };
      }
      
      // Scraperのレスポンスに基づいて返却
      if (scraperResponse.statusCode === 202 && responseData.success) {
        return {
          success: true,
          message: responseData.message || '空き状況取得を開始しました',
          targetDates: dateStrings
        };
      } else if (scraperResponse.statusCode === 409) {
        // Rate limit error
        return {
          success: false,
          message: responseData.message || '空き状況取得は実行中の可能性があります'
        };
      } else {
        // その他のエラー
        return {
          success: false,
          message: responseData.message || '空き状況取得は実行中の可能性があります'
        };
      }
      
    } catch (error) {
      console.error(`Failed to initiate batch scraping: ${error.message}`);
      
      return {
        success: false,
        message: '空き状況取得は実行中の可能性があります'
      };
    }
  }

  async executeSingleScraping() {
    try {
      const targetDates = await targetDatesRepository.getAllTargetDates();
      
      if (!targetDates || targetDates.length === 0) {
        return {
          success: false,
          message: '練習日程が登録されていません'
        };
      }

      const dateStrings = targetDates.map(td => td.date);
      
      // Scraperのレスポンスを待つ
      const scraperResponse = await this.triggerScraperApi(dateStrings);
      
      // Scraperのレスポンスを解析
      let responseData;
      try {
        responseData = JSON.parse(scraperResponse.data);
      } catch (parseError) {
        console.error('Failed to parse scraper response:', parseError);
        return {
          success: false,
          message: '空き状況取得は実行中の可能性があります'
        };
      }
      
      // Scraperのレスポンスに基づいて返却
      if (scraperResponse.statusCode === 202 && responseData.success) {
        return {
          success: true,
          message: responseData.message || '空き状況取得を開始しました',
          targetDates: dateStrings
        };
      } else if (scraperResponse.statusCode === 409) {
        // Rate limit error
        return {
          success: false,
          message: responseData.message || '空き状況取得は実行中の可能性があります'
        };
      } else {
        // その他のエラー
        return {
          success: false,
          message: responseData.message || '空き状況取得は実行中の可能性があります'
        };
      }
      
    } catch (error) {
      console.error(`Failed to initiate scraping: ${error.message}`);
      
      return {
        success: false,
        message: '空き状況取得は実行中の可能性があります'
      };
    }
  }
}

module.exports = new ScrapeService();