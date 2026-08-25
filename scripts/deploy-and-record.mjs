// clasp deploy + record ลง Google Sheet อัตโนมัติ
import { execSync } from 'node:child_process';
import { google } from 'googleapis';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DEPLOY_ID = 'AKfycbwCZqbLixa1nZeudOQspCSDcU-wvJrc75ow9mHBcbnH20QFz4r4hAcaDZc0BAuQx_k';
const SA_PATH = resolve('sa-bct-ai-2026.json');
const SPREADSHEET_ID = '10ca8f2tjo2TJ0Skm8KvkwpL8iMzfFgpCH-L6EpAsRcU';

const desc = new Date().toISOString().slice(0, 10);

// clasp deploy (update existing)
console.log('clasp deploy...');
const output = execSync(`clasp deploy -i ${DEPLOY_ID} --description "${desc}"`, { encoding: 'utf-8' });
console.log(output.trim());

// extract version number (e.g. "@17")
const match = output.match(/@(\d+)/);
const version = match ? match[1] : 'unknown';

// record to Sheet
async function record() {
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
      values: [[`@${version}`, version, desc, 'clasp deploy (auto)', now, 'active']],
    },
  });
  console.log(`Deployment @${version} recorded in Sheet.`);
}

record().catch((e) => console.warn('record-deploy warning:', e.message));
