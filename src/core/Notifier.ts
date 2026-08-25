// Notifier — แจ้งเตือน error ผ่าน Email / Google Chat (Ref: C15, US-014, NFR-04)
import { config } from './config';
import { logger } from './logger';

export class Notifier {
  notifyFailure(summary: string): void {
    const email = config.get('alert_email');
    const webhook = config.get('chat_webhook_url');

    if (email) {
      try {
        MailApp.sendEmail(email, '[AI Workspace] แจ้งเตือนงานล้มเหลว', summary);
      } catch {
        logger.error('alert email failed', {});
      }
    }

    // Google Chat webhook — ต้องเพิ่ม host ใน urlFetchWhitelist เมื่อเปิดใช้จริง
    if (webhook) {
      try {
        UrlFetchApp.fetch(webhook, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ text: summary }),
          muteHttpExceptions: true,
        });
      } catch {
        logger.error('alert chat failed', {});
      }
    }

    if (!email && !webhook) {
      logger.warn('notifyFailure: ยังไม่ตั้งช่องทางแจ้งเตือน (alert_email/chat_webhook_url)', {});
    }
  }
}

export const notifier = new Notifier();
