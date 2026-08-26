// esbuild bundle: src -> dist/Code.gs + copy manifest/html (Add-on 2026-08-25, D3-1)
// ประกาศ global function จริงผ่าน footer shim เพื่อให้ Apps Script + google.script.run มองเห็น
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'dist';
mkdirSync(OUT_DIR, { recursive: true });

// รายชื่อฟังก์ชันที่ Apps Script/google.script.run ต้องเรียกได้ (ตรงกับ export ใน main.ts)
const GLOBAL_FUNCS = [
  'onHomepage', 'onGmailMessageOpen', 'onDocsOpen', 'onSummarize', 'onDraft', 'onConfirmSensitive', 'onSummarizeInbox',
  'onSheetsHome', 'onSheetAnalyze', 'onSheetFormula', 'onSheetTranslate', 'onSheetReport', 'onSheetCheck',
  'doGet', 'doPost', 'runScheduledJob', 'setup',
  'getDashboardData', 'getHealthStatus', 'listConfig', 'saveConfig', 'listPrompts', 'savePrompt',
  'listJobs', 'createJob', 'updateJob', 'deleteJob', 'testAI', 'summarizeInbox',
];

// footer: ประกาศ global function จริง delegate ไปยัง AppBundle (ผลลัพธ์ของ IIFE)
const footer = GLOBAL_FUNCS
  .map((fn) => `function ${fn}() { return AppBundle.${fn}.apply(null, arguments); }`)
  .join('\n');

await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: join(OUT_DIR, 'Code.gs'),
  platform: 'neutral',
  format: 'iife',
  globalName: 'AppBundle',
  target: 'es2019',
  legalComments: 'none',
  footer: { js: footer },
  logLevel: 'info',
});

copyFileSync('appsscript.json', join(OUT_DIR, 'appsscript.json'));

const viewsDir = join('src', 'webapp', 'views');
if (existsSync(viewsDir)) {
  for (const f of readdirSync(viewsDir)) {
    if (f.endsWith('.html')) copyFileSync(join(viewsDir, f), join(OUT_DIR, f));
  }
}

console.log('Build complete -> dist/ (Code.gs + appsscript.json)');
