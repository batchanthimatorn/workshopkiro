# External Resources

## Design Resources
- **Design tool**: none (UI เป็น CardService Add-on + HTML Service/Bootstrap — จะออกแบบตาม design-system steering)
- **Design system docs**: `.kiro/steering/` (design-system-policies) — ยังไม่มี `design-system.md` เฉพาะโครงการ (จะสร้างช่วง design)
- **Wireframes/mockups**: none (มีเพียงหัวข้อ UI ในเอกสาร requirement: หน้า Add-on ผู้ช่วย AI, หน้า Dashboard)

## API Resources
- **OpenAPI/Swagger spec**: none (Web App endpoints + AI prompt contract จะนิยามช่วง design)
- **GraphQL schema**: none
- **Existing API docs**: Gemini API / Vertex AI (external), Google Apps Script Built-in Services

## Knowledge Resources
- **Documentation**:
  - `initial-requirements/project-requirements/Usecase 2 - clasp + gas + ai.md` (SRS — source of truth)
  - `initial-requirements/project-requirements/Usecase 2 - clasp + gas + ai.xlsx`
- **Internal wiki**: none
- **Reference implementations**: none

## Available Tools
- [ ] Design tool MCP server (Figma, Sketch, etc.)
- [x] Web search
- [ ] Other MCP servers: AWS Knowledge (documentation)

## Target Google Resources (ผู้ใช้ให้มา 2026-08-25)
- **Web App deployment URL (Phase 4-6, deployed 2026-08-25)**: `https://script.google.com/macros/s/AKfycbwCZqbLixa1nZeudOQspCSDcU-wvJrc75ow9mHBcbnH20QFz4r4hAcaDZc0BAuQx_k/exec` — executeAs USER_DEPLOYING, access MYSELF (dev)
- **Apps Script Project (`scriptId`)**: `18KyGuenQ6YpqqW_eeMW-TtS0zPieupkLyTymZJ0ojUJ8zMQUcuLvf7wI`
  - ใช้ใน `.clasp.json` (`{"scriptId":"..."}`) สำหรับ `clasp push/deploy`
  - ไม่ใช่ secret (เป็น identifier) แต่ `.clasp.json` ควรอยู่ในการควบคุมตาม convention ของทีม
- **Google Sheet Data Store (`spreadsheetId`)**: `10ca8f2tjo2TJ0Skm8KvkwpL8iMzfFgpCH-L6EpAsRcU` (ผู้ใช้ยืนยันใช้ไฟล์ workshop นี้เป็น data store — Option C, 2026-08-25)
  - **แชร์ให้ SA** (`sds-ai-chanthimatorn@bct-ai-2026.iam.gserviceaccount.com`) เป็น Editor แล้ว
  - **เพิ่ม 6 แท็บแอปแล้ว** (ผ่าน SA): Logs, Config, Prompts, Dashboard, Deployments, Jobs + header; seed Config(9) + Prompts(2) แท็บเดิม (MEMBER/Usecase*) ไม่ถูกแตะ
  - ⚠️ ไฟล์นี้มี PII ของผู้เข้าร่วม workshop ในแท็บ MEMBER — แอปไม่อ่าน/ไม่แตะแท็บนั้น (app tabs แยก); ตั้งใจใช้ร่วมตามที่ผู้ใช้ยืนยัน
  - เก็บ `spreadsheetId` ใน **Script Property `SPREADSHEET_ID`** (ผู้ใช้ต้องตั้งใน Apps Script)
- **หมายเหตุ**: ผม (agent) เปิดลิงก์ Google เหล่านี้โดยตรงไม่ได้ (ต้อง auth) — ใช้เฉพาะ ID; การเข้าถึงข้อมูลจริงเกิดตอนรันบน Apps Script ของผู้ใช้เอง

## Notes
- ไฟล์ `sa-bct-ai-2026.json` ที่ root — service account สำหรับ Vertex AI (optional/future ตาม Add-on ใน decisions-requirements) **ยังไม่เปิดอ่านเนื้อหา (มี private key)**; ต้อง gitignore/claspignore และเก็บ credential ใน Script Properties เท่านั้น
- API Key/Secret ทั้งหมดเก็บใน Script Properties ไม่ commit ลง Git (NFR-02)
