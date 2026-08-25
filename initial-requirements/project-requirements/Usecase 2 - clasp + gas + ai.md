# APP-03 ระบบผู้ช่วยงานอัตโนมัติบน Google Workspace ด้วย AI (clasp + GAS + AI)

## INTRODUCTION APP / USECASE

| Field | Value |
|---|---|
| **App ID:** | APP-03 |
| **App / Usecase Name:** | ระบบผู้ช่วยงานอัตโนมัติบน Google Workspace ด้วย AI (AI Workspace Automation on Google Apps Script) |
| **Usecase Type:** (Greenfield/Brownfield) | Greenfield |
| **Usecase Type NOTE:** | Greenfield prep.<br>- New Source Code (build from scratch, TypeScript + clasp)<br>- New Data model on Google Sheets / Properties Service (to be designed)<br>- UI Mockup: Workspace Add-on Card + Web App (to be designed)<br>- Document SRS, Design, Operation manual, run-book etc. (to be created)<br>- API Spec doc. (Web App endpoints + AI prompt contract, to be defined) |
| **Related Systems:** | ไม่มีระบบเดิม/Legacy ที่ต้องเชื่อมต่อ (Greenfield) — ใช้บริการมาตรฐานของ Google Workspace (Gmail, Drive, Docs, Sheets, Calendar, Chat) ผ่าน Apps Script Built-in Services และเรียก AI ภายนอกผ่าน Gemini API / Vertex AI ด้วย UrlFetchApp |
| **Systems Scope:** | ระบบครอบคลุมการพัฒนา Google Apps Script แบบ Code-first ด้วย clasp (TypeScript + Git) การสรุปอีเมลและเอกสารด้วย AI การร่างข้อความตอบกลับ การตั้งงานอัตโนมัติตามเวลาด้วย Time-driven Trigger การจัดการ Prompt Template และ Dashboard ติดตามการใช้งาน/โควต้า พร้อม CI/CD ผ่าน GitHub Actions ที่ deploy ด้วย clasp push/deploy โดยส่งมอบเป็น Google Workspace Add-on และ Web App |
| **Definitions:** | clasp = Command Line Apps Script Projects (CLI สำหรับ push/pull/deploy โค้ด GAS), GAS = Google Apps Script, Add-on = ส่วนขยายที่ทำงานใน Gmail/Docs/Sheets, Trigger = ตัวกระตุ้นการทำงานตามเวลา/เหตุการณ์, Prompt Template = แม่แบบคำสั่งที่ส่งให้ AI, Deployment ID = รหัสเวอร์ชันที่ deploy, Script Properties = ที่เก็บค่าคอนฟิก/ความลับ, HITL = Human-in-the-loop การให้มนุษย์ตรวจก่อนใช้งานจริง |

## OVERVIEW DESCRIPTION

| Field | Value |
|---|---|
| **Product Perspective:** | แพลตฟอร์มผู้ช่วยงานอัตโนมัติที่ทำงานภายใน Google Workspace ขององค์กร ช่วยให้พนักงานสรุป ค้นหา และร่างเอกสาร/อีเมลด้วย AI ได้จากเครื่องมือที่ใช้อยู่ทุกวัน โดยทีมพัฒนาดูแลโค้ดแบบ Code-first ด้วย clasp + Git แทนการแก้ไขใน Apps Script Web Editor |
| **User Classes:** | • End User (พนักงาน): เรียกใช้ Add-on ใน Gmail/Docs/Sheets เพื่อสรุป ร่าง และแปลเนื้อหาด้วย AI<br>• Automation Owner (เจ้าของกระบวนการ): ตั้งค่า Prompt Template และ Trigger งานอัตโนมัติของทีม<br>• Developer: พัฒนาและทดสอบโค้ด TypeScript แล้ว push/deploy ด้วย clasp ผ่าน Git<br>• Admin: จัดการ OAuth Scope, API Key, โควต้า และตรวจสอบ Audit Log<br>• External System: Gemini API / Vertex AI สำหรับประมวลผลภาษาธรรมชาติ |
| **Assumptions & Constraints:** | • ผู้ใช้งานต้องมีบัญชี Google Workspace ขององค์กรและเชื่อมต่อ Internet<br>• ข้อจำกัดของ Apps Script: เวลาประมวลผลสูงสุด 6 นาที/ครั้ง และโควต้า UrlFetch/Email ต่อวัน<br>• API Key และ Secret ต้องเก็บใน Script Properties ห้าม hardcode หรือ commit ลง Git<br>• พัฒนาแบบ Code-first ด้วย clasp + TypeScript และควบคุมเวอร์ชันด้วย Git เท่านั้น<br>• ขอ OAuth Scope เท่าที่จำเป็นตามหลัก Least Privilege ผ่าน Google Cloud Project |

## TECH STACK

| Layer | Detail |
|---|---|
| **FRONTEND:** | Google Workspace Add-on (CardService) + HTML Service (Bootstrap) + Custom Menu ใน Docs/Sheets |
| **BACKEND:** | Google Apps Script (TypeScript ผ่าน clasp) + Web App (doGet/doPost) + Built-in Services (GmailApp, DriveApp, SpreadsheetApp) |
| **DATABASE:** | Google Sheets เป็น Data Store + Properties Service (Config/Secret) + Cache Service |
| **Infrastructure** | Google Cloud Project (Apps Script API, OAuth Consent) + GitHub + GitHub Actions (clasp push/deploy) + Gemini API / Vertex AI |
| **Policies** | Serverless / Low-code on Google Workspace + Least-privilege OAuth Scope + Config as Code (appsscript.json) |

## FUNCTIONAL REQUIREMENTS (FR)

| FR# | Topic | Function Name | Function Detail | Note |
|---|---|---|---|---|
| FR-01 | AI Assistant | summarize_content_user | ระบบต้องให้ผู้ใช้สรุปเนื้อหาจาก Gmail Thread หรือ Google Docs ได้จาก Add-on โดย<br>• เลือกอีเมลหรือเอกสารที่เปิดอยู่ แล้วกดปุ่มสรุป<br>• ส่งเนื้อหาไป Gemini API ผ่าน UrlFetchApp พร้อม Prompt Template ที่กำหนด<br>• แสดงผลสรุปในการ์ด และคัดลอกหรือแทรกกลับเข้าเอกสารได้<br>• บันทึกประวัติการเรียกใช้ลง Log Sheet | EARS: WHEN ผู้ใช้กดปุ่มสรุป THE SYSTEM SHALL แสดงผลภายใน 15 วินาที หรือแจ้ง Timeout พร้อมให้ลองใหม่ |
| FR-02 | AI Assistant | draft_reply_user | ระบบต้องช่วยร่างข้อความตอบกลับอีเมลด้วย AI โดย<br>• เลือกโทน (ทางการ / กระชับ / เป็นมิตร) และภาษา (ไทย / อังกฤษ)<br>• สร้างผลลัพธ์เป็น Gmail Draft เท่านั้น ไม่ส่งอัตโนมัติ<br>• ผู้ใช้ตรวจแก้ไขและกดส่งเองเสมอ (Human-in-the-loop) | ระบบห้ามส่งอีเมลออกโดยอัตโนมัติทุกกรณี |
| FR-03 | Automation | schedule_job_owner | ระบบต้องให้ Automation Owner ตั้งงานอัตโนมัติได้ โดย<br>• กำหนด Time-driven Trigger แบบรายชั่วโมงหรือรายวัน<br>• เลือก Prompt Template และปลายทางผลลัพธ์ (Sheets / Docs / Google Chat)<br>• เริ่ม หยุด หรือลบงาน และดูสถานะการรันล่าสุดได้ | จำนวน Trigger ต้องไม่เกินโควต้าของ Apps Script ต่อผู้ใช้ |
| FR-04 | DevOps (clasp) | deploy_version_developer | ระบบต้องรองรับการพัฒนาและ Deploy แบบ Code-first ด้วย clasp โดย<br>• Developer เขียน TypeScript ใน Git Repo แล้ว clasp push ขึ้น Apps Script Project<br>• GitHub Actions รัน Lint และ Test ก่อน clasp deploy สร้างเวอร์ชันใหม่เมื่อ merge เข้า main<br>• เก็บ Deployment ID และ Release Note ทุกเวอร์ชัน และ Rollback กลับได้ | ห้ามแก้โค้ดผ่าน Apps Script Web Editor โดยตรง |

## NON-FUNCTIONAL REQUIREMENTS (NFR)

| NFR# | Topic | Function Name | Function Detail | Note |
|---|---|---|---|---|
| NFR-01 | Authentication | google_oauth_login | ระบบต้องยืนยันตัวตนด้วยบัญชี Google Workspace โดย<br>• ใช้ Google OAuth 2.0 ของ Apps Script (Session.getActiveUser)<br>• จำกัดการใช้งานเฉพาะโดเมนขององค์กร<br>• ขอ OAuth Scope เท่าที่จำเป็นตามหลัก Least Privilege | กำหนด Scope ใน appsscript.json และทบทวนทุกครั้งที่ deploy |
| NFR-02 | Security & Compliance | manage_secret_admin | ระบบต้องปกป้องข้อมูลและความลับ โดย<br>• เก็บ API Key ใน Script Properties ห้าม commit ลง Git<br>• บันทึก Audit Log การเรียก AI (ผู้ใช้ เวลา ประเภทงาน) โดยไม่เก็บเนื้อหาส่วนบุคคล<br>• ปฏิบัติตาม PDPA และนโยบายข้อมูลขององค์กร | ใช้ .gitignore และ .claspignore ป้องกันไฟล์ Secret หลุด |
| NFR-03 | Performance | handle_quota_limit | ระบบต้องทำงานได้ภายใต้ข้อจำกัดของ Apps Script โดย<br>• งานที่ใช้เวลานานต้องแบ่งเป็น Batch และใช้ Continuation Trigger ไม่ให้เกิน 6 นาที<br>• ตอบสนองคำขอปกติของ Add-on ภายใน 15 วินาที<br>• ใช้ Cache Service ลดการเรียก AI API ซ้ำ | เฝ้าระวังโควต้า UrlFetch และ Email รายวัน |
| NFR-04 | Monitoring & Logging | monitor_dashboard_admin | ระบบต้องติดตามการทำงานได้ โดย<br>• ส่ง Log ไป Cloud Logging และสรุปลง Dashboard บน Google Sheets<br>• แจ้งเตือน Error ผ่าน Email หรือ Google Chat เมื่อ Job ล้มเหลว<br>• แสดงจำนวนครั้งที่เรียก AI และ Token ที่ใช้ต่อเดือน | ใช้ Error Reporting ของ Google Cloud Project |
| NFR-05 | Maintainability | code_quality_devops | ระบบต้องดูแลรักษาและต่อยอดง่าย โดย<br>• เขียนด้วย TypeScript พร้อม ESLint และ Unit Test ก่อน push<br>• ทุกการเปลี่ยนแปลงผ่าน Pull Request และมี AI Code Review ช่วยตรวจ<br>• มีเอกสาร Run-book และ Prompt Template Registry | โครงสร้าง Repo มาตรฐาน src/, tests/, appsscript.json |

## EXCEPTION CASES

| EX# | Topic | Case Name | Case Detail | Note |
|---|---|---|---|---|
| EX-01 | AI Assistant | AI API Timeout or Quota Exceeded | กรณีเรียก Gemini API ไม่สำเร็จหรือเกินโควต้า ระบบต้องแสดงข้อความแจ้งเตือนที่เข้าใจง่าย ไม่แสดง Stack Trace ให้ผู้ใช้ และบันทึก Error Log พร้อมให้ผู้ใช้ลองใหม่ | Retry แบบ Exponential Backoff สูงสุด 3 ครั้ง |
| EX-02 | DevOps (clasp) | Deploy Failed or Version Conflict | กรณี clasp push หรือ deploy ล้มเหลว หรือมีการแก้โค้ดผ่าน Web Editor ทับ ระบบ CI ต้องหยุด Pipeline แจ้งทีมทันที และ Rollback ไปยัง Deployment เวอร์ชันล่าสุดที่ผ่านการทดสอบ | ตรวจ diff ด้วย clasp pull ก่อน deploy ทุกครั้ง |

## BUSINESS RULE

| BR# | Topic | Rule Name | Rule Detail | Note |
|---|---|---|---|---|
| BR-01 | AI Governance | Human-in-the-loop Before Send | ผลลัพธ์จาก AI ทุกชิ้นต้องผ่านการตรวจสอบและยืนยันโดยผู้ใช้ก่อนส่งออกภายนอกเสมอ ระบบห้ามส่งอีเมลหรือเผยแพร่เอกสารโดยอัตโนมัติ | บันทึกผู้ยืนยันและเวลาที่อนุมัติทุกครั้ง |
| BR-02 | Data Governance | Sensitive Data Restriction | ห้ามส่งข้อมูลชั้นความลับสูงหรือข้อมูลส่วนบุคคลอ่อนไหวออกไปยัง AI API ภายนอก ระบบต้องมีตัวกรองคำสำคัญและแจ้งเตือนผู้ใช้ก่อนส่ง | รายการข้อมูลต้องห้ามกำหนดโดย Admin ใน Config Sheet |

## UI DESIGN

| PAGE | PICTURE |
|---|---|
| หน้า Add-on ผู้ช่วย AI ใน Gmail / Docs (End User) | PICTURE |
| หน้า Dashboard การใช้งานและ Deployment Log (Admin / Developer) | PICTURE |
