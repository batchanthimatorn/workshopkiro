// บันทึก deployment record ลง Google Sheet (แท็บ Deployments) หลัง clasp deploy
// เรียกจาก npm run deploy อัตโนมัติ — ใช้ service account (sa-bct-ai-2026.json)
import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SA_PATH = resolve('sa-bct-ai-2026.json');
const SPREADSHEET_ID = '10ca8f2tjo2TJ0Skm8KvkwpL8iMzfFgpCH-L6EpAsRcU';

const version = process.argv[2] || 'unknown';
const description = process.argv[3] || '';

async function main() {
  const sa = JSON.parse(readFileSync(SA_PATH, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials: sa,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Deployments!A2',
    valueInputOption: 'RAW',
    requestBody: {
      values: [[`@${version}`, version, description, 'clasp deploy (auto)', now, 'active']],
    },
  });
  console.log(`Deployment @${version} recorded in Sheet.`);
}

main().catch((e) => {
  console.warn('record-deploy warning:', e.message);
  // ไม่ fail pipeline ถ้า sheet เข้าไม่ถึง (graceful)
});
