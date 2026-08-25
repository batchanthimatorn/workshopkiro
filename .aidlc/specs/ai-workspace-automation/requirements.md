# Requirements — AI Workspace Automation (APP-03)

## Summary
<!-- 10-line max, downstream reads ONLY this -->
- **Total Stories**: 15 across 5 functional areas
- **Priority**: 9 High, 5 Medium, 1 Low
- **User Types**: End User, Automation Owner, Developer, Admin (External: Gemini API)
- **Key Entities**: Log entry, Config item, Prompt Template, Automation Job (Trigger), Deployment record, Usage/Quota metric
- **Integrations**: Gemini API (UrlFetchApp), Gmail, Google Docs, Google Sheets, GitHub Actions
- **Core Flows**:
  1. End User สรุปอีเมล/เอกสาร → รับผลในการ์ด → คัดลอก/แทรก
  2. End User ร่างข้อความ → AI สร้าง Gmail Draft → ผู้ใช้ตรวจแล้วส่งเอง (HITL)
  3. Automation Owner ตั้ง Trigger + Prompt Template → ผลส่งไป Sheets/Docs
  4. Developer push/deploy ด้วย clasp → CI lint/test → deploy + rollback
  5. Admin ตั้ง secret/config + ตรวจ Audit Log + Dashboard การใช้งาน

---

## Functional Area 1: AI Assistant (สรุป/ร่าง)

### US-001 — สรุปเนื้อหาจาก Gmail/Docs
- **As a** End User
- **I want** สรุปเนื้อหาจาก Gmail Thread หรือ Google Docs ที่เปิดอยู่ผ่าน Add-on
- **So that** เข้าใจใจความสำคัญได้เร็วโดยไม่ต้องอ่านทั้งหมด
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - WHEN ผู้ใช้เปิดอีเมล/เอกสารและกดปุ่ม "สรุป" THEN ระบบ SHALL ส่งเนื้อหาไป Gemini API พร้อม Prompt Template แล้วแสดงผลสรุปในการ์ดภายใน 15 วินาที
  - WHERE ผู้ใช้เลือกภาษาผลลัพธ์ (ไทย/อังกฤษ) WHEN กดสรุป THEN ระบบ SHALL คืนผลสรุปเป็นภาษาที่เลือก
  - THE system SHALL แสดงปุ่มคัดลอกและปุ่มแทรกผลกลับเข้าเอกสาร
  - WHEN สร้างผลสรุปสำเร็จ THEN ระบบ SHALL บันทึกประวัติการเรียกใช้ลง Log Sheet (ผู้ใช้/เวลา/ประเภทงาน โดยไม่เก็บเนื้อหาส่วนบุคคล)
  - IF การเรียก AI เกิน 15 วินาทีหรือ timeout THEN ระบบ SHALL แสดงข้อความแจ้ง timeout ที่เข้าใจง่ายพร้อมปุ่มลองใหม่ ELSE แสดงผลสรุป
- **Dependencies**: US-009 (auth), US-013 (error handling), US-006 (prompt template)
- **Source**: FR-01, D1-4, D1-10

### US-002 — ร่างข้อความตอบกลับอีเมล (HITL)
- **As a** End User
- **I want** ให้ AI ช่วยร่างข้อความตอบกลับอีเมลตามโทนและภาษาที่เลือก
- **So that** ตอบอีเมลได้เร็วขึ้นโดยยังตรวจแก้เองก่อนส่ง
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - WHEN ผู้ใช้เลือกโทน (ทางการ/กระชับ/เป็นมิตร) และภาษา (ไทย/อังกฤษ) แล้วกด "ร่าง" THEN ระบบ SHALL สร้างผลลัพธ์เป็น Gmail Draft เท่านั้น
  - THE system SHALL NOT ส่งอีเมลออกโดยอัตโนมัติในทุกกรณี (Human-in-the-loop)
  - WHILE ผู้ใช้อยู่ในขั้นตอนร่าง IF ผู้ใช้ยังไม่กดส่งเอง THEN ระบบ SHALL คงสถานะเป็น Draft และไม่ดำเนินการส่ง
  - WHEN สร้าง Draft สำเร็จ THEN ระบบ SHALL บันทึก Log และแสดงลิงก์ไปยัง Draft
- **Dependencies**: US-009, US-012 (HITL/filter), US-013
- **Source**: FR-02, BR-01, D1-10

---

## Functional Area 2: Automation (งานอัตโนมัติตามเวลา)

### US-003 — ตั้งงานอัตโนมัติตามเวลา
- **As a** Automation Owner
- **I want** สร้างงานอัตโนมัติแบบ Time-driven Trigger (รายชั่วโมง/รายวัน) พร้อมเลือก Prompt Template และปลายทาง
- **So that** งานสรุป/รวบรวมประจำทำเองอัตโนมัติ
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - WHEN Automation Owner สร้างงานใหม่โดยเลือกความถี่ (รายชั่วโมง/รายวัน) + Prompt Template + ปลายทาง (Sheets/Docs) THEN ระบบ SHALL สร้าง Time-driven Trigger และบันทึกการตั้งค่างาน
  - IF จำนวน Trigger ถึงโควต้าของ Apps Script ต่อผู้ใช้ THEN ระบบ SHALL ปฏิเสธการสร้างพร้อมข้อความแจ้งเหตุผล ELSE สร้างงานสำเร็จ
  - WHEN ถึงเวลาที่กำหนด THEN ระบบ SHALL รันงานและส่งผลลัพธ์ไปยังปลายทางที่เลือก (Google Sheets หรือ Google Docs)
- **Dependencies**: US-006, US-013
- **Source**: FR-03, D1-6

### US-004 — ควบคุมและติดตามสถานะงานอัตโนมัติ
- **As a** Automation Owner
- **I want** เริ่ม หยุด ลบ และดูสถานะการรันล่าสุดของงานอัตโนมัติ
- **So that** ควบคุมงานและรู้ว่างานสำเร็จหรือล้มเหลว
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - WHEN Automation Owner สั่งเริ่ม/หยุด/ลบงาน THEN ระบบ SHALL อัปเดตสถานะ Trigger ให้ตรงและยืนยันผล
  - THE system SHALL แสดงสถานะการรันล่าสุดของแต่ละงาน (สำเร็จ/ล้มเหลว/เวลา)
  - WHEN งานรันล้มเหลว THEN ระบบ SHALL บันทึก error log ของงานนั้น
- **Dependencies**: US-003, US-014 (monitoring)
- **Source**: FR-03

### US-005 — จัดการ Prompt Template Registry
- **As a** Automation Owner
- **I want** สร้าง/แก้ไข/เลือก Prompt Template จาก registry กลาง
- **So that** ใช้แม่แบบคำสั่ง AI ซ้ำได้อย่างสม่ำเสมอ
- **Priority**: Medium
- **Acceptance Criteria (EARS)**:
  - THE system SHALL จัดเก็บ Prompt Template ใน Google Sheet (Prompt Template Registry)
  - WHEN ผู้ใช้เลือก Prompt Template สำหรับงานสรุป/ร่าง/อัตโนมัติ THEN ระบบ SHALL ใช้แม่แบบนั้นในการประกอบคำสั่งส่ง AI
  - WHEN Automation Owner เพิ่ม/แก้ไข template THEN ระบบ SHALL บันทึกและทำให้ใช้งานได้ทันที
- **Dependencies**: US-007 (config/data foundation)
- **Source**: NFR-05, FR-03

---

## Functional Area 3: DevOps (clasp + CI/CD)

### US-006 — พัฒนาและ Deploy แบบ code-first ด้วย clasp
- **As a** Developer
- **I want** เขียน TypeScript ใน Git แล้ว push/deploy ขึ้น Apps Script ด้วย clasp
- **So that** ควบคุมเวอร์ชันโค้ดได้แบบ code-first แทนการแก้ใน Web Editor
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - THE system (repo) SHALL มีโครงมาตรฐาน `src/`, `tests/`, `appsscript.json`, `.clasp.json` และ compile TypeScript ก่อน clasp push ได้
  - WHEN Developer รัน `clasp push` THEN โค้ด SHALL ถูกอัปโหลดขึ้น Apps Script Project ที่ผูกไว้
  - THE system SHALL มี `.gitignore` และ `.claspignore` ที่ป้องกันไฟล์ secret/สร้างจาก build ไม่ให้หลุด
  - THE developer SHALL NOT แก้โค้ดผ่าน Apps Script Web Editor โดยตรง (ระบุใน run-book)
- **Dependencies**: —
- **Source**: FR-04, D1-9, NFR-05

### US-007 — CI/CD lint/test + deploy + rollback (ขั้นท้าย/optional)
- **As a** Developer
- **I want** GitHub Actions รัน lint/test แล้ว clasp deploy อัตโนมัติเมื่อ merge main พร้อม rollback ได้
- **So that** deploy มีคุณภาพและย้อนกลับได้เมื่อผิดพลาด
- **Priority**: Medium
- **Acceptance Criteria (EARS)**:
  - WHEN มีการเปิด Pull Request THEN CI SHALL รัน ESLint และ Unit Test และรายงานผลบน PR
  - WHEN merge เข้า main สำเร็จ THEN CI SHALL รัน `clasp deploy` สร้างเวอร์ชันใหม่และบันทึก Deployment ID + Release Note
  - IF `clasp push`/`deploy` ล้มเหลว หรือพบว่ามีการแก้ผ่าน Web Editor ทับ THEN CI SHALL หยุด pipeline แจ้งทีม และคง Deployment เวอร์ชันล่าสุดที่ผ่านการทดสอบ (rollback)
- **Dependencies**: US-006
- **Source**: FR-04, EX-02, D1-9

---

## Functional Area 4: Security & Compliance

### US-008 — OAuth login + จำกัดโดเมน + least privilege
- **As a** Admin
- **I want** ให้ระบบยืนยันตัวตนด้วย Google OAuth และจำกัดเฉพาะโดเมนองค์กร ด้วย scope เท่าที่จำเป็น
- **So that** เฉพาะผู้ใช้ที่ได้รับอนุญาตเข้าถึงและลดความเสี่ยง
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - WHEN ผู้ใช้เปิด Add-on/Web App THEN ระบบ SHALL ยืนยันตัวตนด้วย Google OAuth 2.0 (Session.getActiveUser)
  - IF อีเมลผู้ใช้ไม่ได้อยู่ในโดเมนองค์กรที่อนุญาต THEN ระบบ SHALL ปฏิเสธการใช้งานพร้อมข้อความแจ้ง ELSE อนุญาตตามบทบาท
  - THE system SHALL ประกาศ OAuth Scope เท่าที่จำเป็น (least privilege) ใน `appsscript.json`
- **Dependencies**: —
- **Source**: NFR-01

### US-009 — จัดการ Secret ใน Script Properties
- **As a** Admin
- **I want** เก็บ API Key/Secret ใน Script Properties ไม่ให้อยู่ในโค้ดหรือ Git
- **So that** ความลับไม่หลุดและปฏิบัติตามนโยบายความปลอดภัย
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - THE system SHALL อ่าน API Key/Secret จาก Script Properties เท่านั้น ไม่ hardcode ในซอร์สโค้ด
  - IF ไม่พบ API Key ที่จำเป็นใน Script Properties THEN ระบบ SHALL แจ้ง error ที่ชัดเจน (ไม่เปิดเผยค่า secret) และไม่เรียก AI
  - THE repo SHALL ไม่มีไฟล์ secret ถูก commit (ป้องกันด้วย `.gitignore`/`.claspignore`)
- **Dependencies**: US-006
- **Source**: NFR-02

### US-010 — ตัวกรองข้อมูลต้องห้าม + Human-in-the-loop
- **As a** End User / Admin
- **I want** ให้ระบบตรวจและเตือนก่อนส่งข้อมูลชั้นความลับสูง/PII ออกไป AI และบังคับให้คนตรวจก่อนใช้ผล
- **So that** ไม่ให้ข้อมูลอ่อนไหวรั่วไปยัง AI ภายนอก (PDPA)
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - WHILE กำลังจะส่งเนื้อหาไป AI IF ตรวจพบคำสำคัญ/รูปแบบข้อมูลต้องห้าม (จาก Config Sheet) THEN ระบบ SHALL แจ้งเตือนผู้ใช้และหยุดรอการยืนยันก่อนส่ง ELSE ส่งได้ตามปกติ
  - THE system SHALL บังคับให้ผลลัพธ์ AI ทุกชิ้นผ่านการยืนยันโดยผู้ใช้ก่อนส่งออกภายนอก (ไม่ส่ง/เผยแพร่อัตโนมัติ)
  - WHEN ผู้ใช้ยืนยันการใช้ผลลัพธ์ THEN ระบบ SHALL บันทึกผู้ยืนยันและเวลาที่อนุมัติลง Log
- **Dependencies**: US-002, US-011 (config), US-012 (audit)
- **Source**: BR-01, BR-02

### US-011 — Audit Log การเรียกใช้ AI
- **As a** Admin
- **I want** บันทึก Audit Log การเรียก AI (ผู้ใช้ เวลา ประเภทงาน) โดยไม่เก็บเนื้อหาส่วนบุคคล
- **So that** ตรวจสอบย้อนหลังและปฏิบัติตาม PDPA ได้
- **Priority**: Medium
- **Acceptance Criteria (EARS)**:
  - WHEN มีการเรียก AI (สรุป/ร่าง/อัตโนมัติ) THEN ระบบ SHALL เขียน Log entry (ผู้ใช้, เวลา, ประเภทงาน, สถานะ) ลง Log Sheet
  - THE system SHALL NOT บันทึกเนื้อหาส่วนบุคคล/ข้อความเต็มลง Log
  - THE system SHALL ส่ง log ไป Cloud Logging เพื่อสนับสนุนการตรวจสอบ
- **Dependencies**: US-006
- **Source**: NFR-02, NFR-04

### US-012 — จัดการ error, timeout และโควต้า
- **As a** End User / Admin
- **I want** ให้ระบบจัดการ AI timeout/quota-exceeded อย่างปลอดภัยและ retry อย่างเหมาะสม
- **So that** ผู้ใช้ไม่เจอ error ดิบ และระบบทำงานได้ภายใต้ข้อจำกัด Apps Script
- **Priority**: High
- **Acceptance Criteria (EARS)**:
  - IF การเรียก Gemini API ล้มเหลวหรือเกินโควต้า THEN ระบบ SHALL retry แบบ exponential backoff สูงสุด 3 ครั้ง ELSE คืนผลปกติ
  - IF ยัง retry ไม่สำเร็จ THEN ระบบ SHALL แสดงข้อความแจ้งที่เข้าใจง่าย (ไม่แสดง stack trace) และบันทึก Error Log
  - WHERE งานใช้เวลานานเกินขีดจำกัด Apps Script (6 นาที) WHEN ประมวลผล THEN ระบบ SHALL แบ่งเป็น batch/Continuation และใช้ Cache Service ลดการเรียกซ้ำ
- **Dependencies**: US-001, US-002, US-003
- **Source**: EX-01, NFR-03

---

## Functional Area 5: Monitoring & Dashboard

### US-013 — Dashboard การใช้งานและโควต้า
- **As a** Admin / Developer
- **I want** Dashboard บน Google Sheets แสดงจำนวนการเรียก AI, Token ที่ใช้ต่อเดือน และ Deployment Log
- **So that** เห็นภาพรวมการใช้งานและควบคุมต้นทุน/โควต้า
- **Priority**: Medium
- **Acceptance Criteria (EARS)**:
  - THE system SHALL สรุปข้อมูลการใช้งาน (จำนวนครั้งเรียก AI, Token/เดือน) ลง Dashboard Sheet
  - THE system SHALL แสดง Deployment Log (Deployment ID, เวอร์ชัน, Release Note) บน Dashboard
  - WHEN มีการเรียก AI หรือ deploy ใหม่ THEN ระบบ SHALL อัปเดตตัวเลขบน Dashboard
- **Dependencies**: US-011, US-007
- **Source**: NFR-04

### US-014 — แจ้งเตือนเมื่อ Job ล้มเหลว
- **As a** Admin
- **I want** รับแจ้งเตือนผ่าน Email หรือ Google Chat เมื่องานอัตโนมัติหรือการเรียก AI ล้มเหลว
- **So that** แก้ไขปัญหาได้ทันเวลา
- **Priority**: Low
- **Acceptance Criteria (EARS)**:
  - WHEN งานอัตโนมัติหรือการเรียก AI ล้มเหลวเกินเกณฑ์ที่กำหนด THEN ระบบ SHALL ส่งการแจ้งเตือนไปยัง Admin (Email หรือ Google Chat)
  - THE notification SHALL ระบุประเภทงาน เวลา และสรุปสาเหตุ โดยไม่เปิดเผยข้อมูลส่วนบุคคล
- **Dependencies**: US-004, US-012
- **Source**: NFR-04

### US-015 — Health check / สถานะระบบเบื้องต้น
- **As a** Admin
- **I want** ตรวจสถานะการเชื่อมต่อ AI provider และ config ที่จำเป็นได้
- **So that** ยืนยันว่าระบบพร้อมใช้งานก่อนให้ผู้ใช้เรียกใช้
- **Priority**: Medium
- **Acceptance Criteria (EARS)**:
  - WHEN Admin เปิดหน้า health check THEN ระบบ SHALL รายงานสถานะการตั้งค่า (มี API Key, โดเมนอนุญาต, sheets ที่จำเป็น) โดยไม่แสดงค่า secret
  - IF config จำเป็นขาด THEN ระบบ SHALL แสดงรายการที่ขาดพร้อมคำแนะนำการแก้ไข
- **Dependencies**: US-009, US-013
- **Source**: NFR-03, NFR-04 (derived)

---

## Story Summary

| ID | Title | Area | Priority | Dependencies |
|---|---|---|---|---|
| US-001 | สรุปเนื้อหาจาก Gmail/Docs | AI Assistant | High | US-008, US-012, US-005 |
| US-002 | ร่างข้อความตอบกลับ (HITL) | AI Assistant | High | US-008, US-010, US-012 |
| US-003 | ตั้งงานอัตโนมัติตามเวลา | Automation | High | US-005, US-012 |
| US-004 | ควบคุม/ติดตามงานอัตโนมัติ | Automation | High | US-003, US-013 |
| US-005 | จัดการ Prompt Template Registry | Automation | Medium | US-006 |
| US-006 | Code-first + clasp push/deploy | DevOps | High | — |
| US-007 | CI/CD lint/test + deploy + rollback | DevOps | Medium | US-006 |
| US-008 | OAuth + จำกัดโดเมน + least privilege | Security | High | — |
| US-009 | จัดการ Secret ใน Script Properties | Security | High | US-006 |
| US-010 | ตัวกรองข้อมูลต้องห้าม + HITL | Security | High | US-002, US-011 |
| US-011 | Audit Log การเรียกใช้ AI | Security | Medium | US-006 |
| US-012 | จัดการ error/timeout/quota | Security | High | US-001, US-002, US-003 |
| US-013 | Dashboard การใช้งาน/โควต้า | Monitoring | Medium | US-011, US-007 |
| US-014 | แจ้งเตือนเมื่อ Job ล้มเหลว | Monitoring | Low | US-004, US-012 |
| US-015 | Health check สถานะระบบ | Monitoring | Medium | US-008, US-013 |

## Story–Persona Matrix

| ID | End User | Automation Owner | Developer | Admin |
|---|---|---|---|---|
| US-001 | Primary | — | — | — |
| US-002 | Primary | — | — | — |
| US-003 | — | Primary | — | Secondary |
| US-004 | — | Primary | — | Secondary |
| US-005 | — | Primary | — | Secondary |
| US-006 | — | — | Primary | — |
| US-007 | — | — | Primary | Secondary |
| US-008 | Secondary | — | — | Primary |
| US-009 | — | — | Secondary | Primary |
| US-010 | Primary | Secondary | — | Primary |
| US-011 | — | — | — | Primary |
| US-012 | Primary | Secondary | — | Secondary |
| US-013 | — | — | Secondary | Primary |
| US-014 | — | Secondary | — | Primary |
| US-015 | — | — | Secondary | Primary |

## Non-functional Notes (cross-cutting)
- **Performance/Quota (NFR-03)**: ตอบสนอง Add-on ปกติ ≤15 วินาที, งานยาวแบ่ง batch/Continuation ไม่เกิน 6 นาที, ใช้ Cache Service ลดการเรียกซ้ำ, เฝ้าระวังโควต้า UrlFetch/Email รายวัน
- **Security (NFR-01/02)**: OAuth least privilege, secret ใน Script Properties, ไม่ commit secret, audit log ไม่เก็บ PII, encryption in transit (HTTPS ผ่าน UrlFetchApp)
- **Maintainability (NFR-05)**: TypeScript + ESLint + Unit Test, PR-based, run-book + Prompt Template Registry
- **Governance (BR-01/02)**: Human-in-the-loop ก่อนส่งทุกกรณี, ตัวกรองข้อมูลต้องห้ามก่อนส่ง AI

## Out of Scope (D1-11)
- การส่งอีเมล/เผยแพร่เอกสารโดยอัตโนมัติ (ต้อง HITL เสมอ)
- การเชื่อมต่อระบบ legacy/ภายนอกอื่นนอกเหนือจาก Google Workspace + Gemini
- Mobile native application

## External References

| Source | Stories Derived | What Was Used |
|---|---|---|
| `initial-requirements/.../Usecase 2 - clasp + gas + ai.md` | US-001..US-015 | FR-01..04, NFR-01..05, EX-01/02, BR-01/02, Tech Stack, User Classes |
| `decisions-requirements.md` (D1) | ทั้งหมด | ขอบเขต/ตัวเลือกที่ผู้ใช้ยืนยัน |
