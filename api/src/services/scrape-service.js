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
        },
        timeout: 10000 // 10秒のタイムアウト
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

      req.on('timeout', () => {
        console.error('Request to scraper API timed out');
        req.destroy();
        reject(new Error('Request timeout: Scraper API did not respond within 10 seconds'));
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
        console.error('Raw response:', scraperResponse.data);
        return {
          success: false,
          message: 'スクレイパーからのレスポンス解析に失敗しました'
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
        // Rate limit error - 実行中
        return {
          success: false,
          message: responseData.message || '現在スクレイピング処理が実行中です。しばらくお待ちください'
        };
      } else if (scraperResponse.statusCode === 400) {
        // Bad request
        return {
          success: false,
          message: responseData.message || '不正なリクエストです'
        };
      } else {
        // その他のエラー
        console.error('Unexpected scraper response:', scraperResponse.statusCode, responseData);
        return {
          success: false,
          message: responseData.message || 'スクレイピング処理でエラーが発生しました'
        };
      }
      
    } catch (error) {
      console.error(`Failed to initiate batch scraping: ${error.message}`);
      
      // タイムアウトエラーの場合
      if (error.message && error.message.includes('timeout')) {
        return {
          success: false,
          message: 'スクレイパーへの接続がタイムアウトしました。しばらく待ってから再試行してください'
        };
      }
      
      // 接続エラーの場合
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'スクレイパーサービスに接続できません。システム管理者にお問い合わせください'
        };
      }
      
      return {
        success: false,
        message: `エラーが発生しました: ${error.message || '不明なエラー'}`
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
        console.error('Raw response:', scraperResponse.data);
        return {
          success: false,
          message: 'スクレイパーからのレスポンス解析に失敗しました'
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
        // Rate limit error - 実行中
        return {
          success: false,
          message: responseData.message || '現在スクレイピング処理が実行中です。しばらくお待ちください'
        };
      } else if (scraperResponse.statusCode === 400) {
        // Bad request
        return {
          success: false,
          message: responseData.message || '不正なリクエストです'
        };
      } else {
        // その他のエラー
        console.error('Unexpected scraper response:', scraperResponse.statusCode, responseData);
        return {
          success: false,
          message: responseData.message || 'スクレイピング処理でエラーが発生しました'
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