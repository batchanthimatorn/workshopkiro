# Requirements Decisions (D1)

## Context Summary
- **Product**: ระบบผู้ช่วยงานอัตโนมัติบน Google Workspace ด้วย AI (APP-03) — Greenfield, scope=new, comprehensive
- **Stack**: TypeScript → Google Apps Script (clasp) / Google Sheets + Properties Service / Gemini API
- **FR หลัก**: FR-01 สรุปเนื้อหา, FR-02 ร่างข้อความตอบกลับ, FR-03 ตั้งงานอัตโนมัติ, FR-04 deploy code-first (clasp)
- **NFR**: Auth (OAuth), Security/Compliance (PDPA, secret), Performance/Quota, Monitoring/Dashboard, Maintainability
- **BR**: BR-01 Human-in-the-loop ก่อนส่ง, BR-02 ห้ามส่งข้อมูลชั้นความลับสูง/PII ออก AI
- **User classes**: End User, Automation Owner, Developer, Admin (+ External: Gemini API)
- **นโยบาย hands-on-project**: ต้องทำครบทุก function ตาม scope, ทำงานได้จริง (runnable), deploy เป็น optional ลำดับสุดท้าย, ข้าม decomposition

> หมายเหตุ: FR ทั้ง 4 อยู่ใน scope ที่ต้องพัฒนาให้ครบ คำถามด้านล่างเน้น "ตัวเลือก/ขอบเขต/ลำดับ" ที่ยังไม่ชัดในเอกสาร ไม่ใช่การตัดฟีเจอร์ออก

---

## Decision Questions

### D1-1: กลุ่มผู้ใช้ (Personas)
**Question**: ควรสร้างเอกสาร personas แยกหรือไม่ (เอกสารระบุ 4 กลุ่มผู้ใช้ที่มีเป้าหมาย/สิทธิ์ต่างกัน: End User, Automation Owner, Developer, Admin)
- 1) สร้าง personas ครบทั้ง 4 กลุ่ม เพื่อผูกกับ user stories ให้ชัด **(Recommended)**
- 2) สร้างเฉพาะกลุ่มหลัก (End User + Admin) ที่เหลือรวมใน stories
- 3) ไม่สร้าง personas แยก ใช้ user type ใน stories พอ
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-2: ขนาดทีมพัฒนา (Team Size)
**Question**: มี developer กี่คนที่จะทำงานโปรเจกต์นี้ (ใช้กำหนดกฎ validation ใน D2/D3/D5)
- 1) Solo (1 คน) **(Recommended — บริบท hands-on/workshop)**
- 2) ทีมเล็ก (2–3 คน)
- 3) ทีมกลาง (4–8 คน)
- 4) ทีมใหญ่ (9+ คน)

**Answer**: 1

---

### D1-3: ผู้ให้บริการ AI (AI Provider)
**Question**: จะใช้ AI ตัวใดเป็นหลักในการเรียกผ่าน UrlFetchApp (เอกสารระบุทั้ง Gemini API และ Vertex AI)
- 1) Gemini API (Google AI Studio) — ตั้งค่าง่าย ใช้ API Key ใน Script Properties **(Recommended)**
- 2) Vertex AI (ผ่าน GCP + OAuth) — เหมาะกับ enterprise แต่ตั้งค่าซับซ้อนกว่า
- 3) ออกแบบเป็น provider abstraction รองรับทั้งสอง สลับได้ผ่าน config
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-4: โฮสต์ของ Add-on ที่อยู่ใน scope
**Question**: Add-on ผู้ช่วย AI ต้องทำงานในแอปใดบ้าง (FR-01 ระบุ Gmail + Docs)
- 1) Gmail + Google Docs (ตรงตาม FR-01/FR-02) **(Recommended)**
- 2) Gmail อย่างเดียวก่อน
- 3) Gmail + Docs + Sheets (ครอบคลุมทุก editor)
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-5: วิธีเรียก AI API ระหว่างพัฒนา (Dev Integration Mode)
**Question**: ช่วงพัฒนา/ทดสอบ จะเรียก Gemini API จริงหรือใช้ mock/dry-run (ตามนโยบาย workshop: key เป็น key ชั่วคราว, ทำ FE+mock ก่อน)
- 1) เริ่มด้วย mock/dry-run (ไฟล์ .json + flag) แล้วต่อ API จริงภายหลังเมื่อพร้อม **(Recommended)**
- 2) ต่อ Gemini API จริงตั้งแต่แรก (ต้องมี API key ที่ใช้ได้)
- 3) ทำ toggle สลับ mock/real ผ่าน Script Property
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-6: ปลายทางผลลัพธ์งานอัตโนมัติ (FR-03 Automation Output)
**Question**: งานอัตโนมัติ (Time-driven Trigger) ต้องส่งผลลัพธ์ไปที่ใดบ้างใน scope
- 1) Google Sheets + Google Docs **(Recommended)**
- 2) Google Sheets อย่างเดียว
- 3) Google Sheets + Docs + Google Chat (ครบตามเอกสาร)
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-7: ขอบเขต Data Store (Google Sheets)
**Question**: จะสร้าง Sheet อะไรบ้างเป็น data store ใน scope นี้
- 1) Log Sheet + Config Sheet + Prompt Template Registry + Dashboard Sheet (ครบตามเอกสาร) **(Recommended)**
- 2) Log Sheet + Config Sheet เท่านั้น (ขั้นต่ำ)
- 3) Log + Config + Prompt Registry (ยังไม่ทำ Dashboard)
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-8: Stories ด้าน Security & Compliance
**Question**: จะแตก NFR-02/BR-02 (PDPA, เก็บ secret, Audit Log, ตัวกรองข้อมูลต้องห้ามก่อนส่ง AI) เป็น user stories ชัดเจนหรือไม่
- 1) แตกเป็น stories เฉพาะด้าน security/compliance ครบ (secret mgmt, audit log, sensitive-data filter) **(Recommended)**
- 2) ผูกเป็น acceptance criteria ในแต่ละ story ที่เกี่ยวข้อง ไม่แยก story
- 3) ทำเฉพาะ secret management + audit log (เลื่อน sensitive-data filter)
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-9: ขอบเขต CI/CD และ Deploy (FR-04)
**Question**: FR-04 (clasp + GitHub Actions) จะรวมใน scope หลักแค่ไหน (นโยบาย hands-on: deploy เป็น optional ลำดับสุดท้าย)
- 1) โครง code-first (clasp push/deploy manual) + config พร้อม, GitHub Actions CI/CD ทำเป็นขั้นสุดท้าย/optional **(Recommended)**
- 2) รวม GitHub Actions CI/CD เต็มรูปแบบใน scope หลัก
- 3) เฉพาะ clasp push/pull local เท่านั้น (ยังไม่ทำ deploy/rollback อัตโนมัติ)
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-10: ภาษาที่รองรับในผลลัพธ์ AI
**Question**: ผลลัพธ์สรุป/ร่างข้อความต้องรองรับภาษาใด (FR-02 ระบุ ไทย/อังกฤษ)
- 1) ไทย + อังกฤษ (ผู้ใช้เลือกได้) **(Recommended)**
- 2) ไทยเป็นหลัก อังกฤษเป็น optional
- 3) ตามภาษาต้นฉบับอัตโนมัติ + override ได้
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

### D1-11: ขอบเขตที่อยู่นอก scope (Out-of-scope)
**Question**: ข้อใดควรระบุว่า "อยู่นอก scope" ของโปรเจกต์นี้อย่างชัดเจน
- 1) การส่งอีเมล/เผยแพร่อัตโนมัติ (ต้อง HITL เสมอ), การเชื่อมระบบ legacy, mobile native app **(Recommended)**
- 2) เฉพาะการส่งอัตโนมัติเท่านั้นที่นอก scope
- 3) ไม่ระบุ out-of-scope (ทำตามเอกสารทั้งหมด)
- 4) Other (โปรดระบุ): _______

**Answer**: 1

---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream phases: read ONLY this section. -->
- D1-1 Personas: สร้าง personas ครบทั้ง 4 กลุ่ม (End User, Automation Owner, Developer, Admin)
- D1-2 Team Size: Solo (1 คน)
- D1-3 AI Provider: **AI provider abstraction** — Gemini API (default, key ใน Script Properties) + Vertex AI (service account) เสียบเพิ่มได้ทีหลัง [ปรับใน Add-on]
- D1-4 Add-on Hosts: Gmail + Google Docs
- D1-5 Dev Integration Mode: เริ่มด้วย mock/dry-run (.json + flag) แล้วต่อ Gemini API จริงภายหลัง
- D1-6 Automation Output: Google Sheets + Google Docs
- D1-7 Data Store Scope: Log Sheet + Config Sheet + Prompt Template Registry + Dashboard Sheet (ครบ)
- D1-8 Security/Compliance Stories: แตกเป็น stories เฉพาะครบ (secret mgmt, audit log, sensitive-data filter)
- D1-9 CI/CD & Deploy Scope: code-first (clasp manual) + config พร้อม, GitHub Actions CI/CD ทำเป็นขั้นสุดท้าย/optional
- D1-10 AI Output Languages: ไทย + อังกฤษ (ผู้ใช้เลือกได้)
- D1-11 Out-of-scope: ส่งอีเมล/เผยแพร่อัตโนมัติ, เชื่อมระบบ legacy, mobile native app

---

## Validation Notes (D1)
- 🟡 **Full-product scope + Solo developer**: โปรเจกต์เป็น greenfield เต็มรูปแบบ (4 FR + 5 NFR + Add-on + Web App + CI/CD) แต่ทีมเป็น Solo — โดยปกติกฎ validation จะเตือนเรื่องขนาดงานเทียบทีม
  - **Resolution (justified keep)**: scope ถูกกำหนดตายตัวโดยเอกสาร requirement + นโยบาย hands-on (ต้องทำครบทุก function) จึงไม่ลด scope แต่ใช้ **phased build** เป็นตัวลดความเสี่ยง: (1) เริ่ม mock-first (D1-5), (2) CI/CD ไว้ท้ายสุด/optional (D1-9), (3) ลำดับ Setup → FE+mock → FE+backend ตามนโยบาย
- ตัวเลือกอื่นไม่พบ conflict (personas=Yes สอดคล้องกับ user types ≥ 3; integrations หลักคือ Gemini + Google built-in services)


---

## Add-on

### [2026-08-25] เปลี่ยน AI Provider เป็น provider abstraction (จาก D3 design phase)
- **บริบท**: ผู้ใช้แจ้งว่ามี service account `sa-bct-ai-2026.json` และอาจใช้กับฝั่ง AI
- **การเปลี่ยนแปลง (ผู้ใช้อนุมัติ "ตกลง")**:
  - D1-3 เปลี่ยนจาก "Gemini API เท่านั้น" → **AI provider abstraction**: interface `AIProvider` เดียว มี 2 implementation
    - **GeminiProvider** (default) — Gemini API key เก็บใน Script Properties, ใช้กับ mock-first workshop
    - **VertexAIProvider** (optional/future) — Vertex AI + service account (JWT flow), **ไม่อยู่ใน MVP**
  - **NFR-01 (OAuth ผู้ใช้ / US-008) คงเดิม** — service account ไม่เกี่ยวกับการล็อกอินผู้ใช้ (machine identity ≠ user identity)
- **ผลกระทบด้านความปลอดภัย (บังคับทำในขั้น setup)**:
  - เพิ่ม `sa-bct-ai-2026.json` เข้า `.gitignore` + `.claspignore` — ห้าม commit
  - credential เก็บใน Script Properties เท่านั้น ไม่ hardcode/ไม่ bundle เข้า client
  - Vertex AI + SA (JWT signing ด้วย `apps-script-oauth2`) เป็น future scope
- **ไฟล์ที่ปรับ**: `decisions-requirements.md` (D1-3), `blueprints/tech.md`, `blueprints/resources.md`, และสะท้อนใน `decisions-design.md` (D3-5/D3-6) + `design/integration.md`
