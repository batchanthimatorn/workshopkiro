# Context Assessment

## Summary
<!-- 10-line max. Downstream phases read ONLY this section. -->
- **Type**: Greenfield
- **Scope**: new
- **Stack**: TypeScript / Google Apps Script (clasp) / Google Sheets + Properties Service / Gemini API
- **Architecture**: Serverless / Low-code บน Google Workspace (Add-on CardService + HTML Service + Web App doGet/doPost)
- **Feature**: ระบบผู้ช่วยงานอัตโนมัติบน Google Workspace ด้วย AI — สรุป/ร่างข้อความ, ตั้งงานอัตโนมัติ, และ deploy แบบ code-first ด้วย clasp
- **Impact**: New standalone (Greenfield — สร้างใหม่ทั้งหมด)
- **Complexity**: Medium — ประมาณ 7-9 stories, 3 domain (AI Assistant, Automation, DevOps), 4 user types
- **Recommendations**: Personas [Yes], Units [No], NFR [Yes]

## Project Overview
- **Type**: Greenfield
- **Assessment Date**: 2026-08-25T10:00:00Z
- **App ID**: APP-03
- **Reference**: `initial-requirements/project-requirements/Usecase 2 - clasp + gas + ai.md` (source of truth)

## Technology Stack
- **Languages**: TypeScript (คอมไพล์เป็น Apps Script ผ่าน clasp)
- **Frameworks**: Google Apps Script (CardService, HTML Service, Built-in Services: GmailApp/DriveApp/SpreadsheetApp), Bootstrap (HTML UI)
- **Build System**: clasp (Command Line Apps Script Projects) + npm (TypeScript toolchain)
- **Testing**: ESLint + Unit Test (framework จะเลือกใน D3 — Jest/GAS test harness)
- **Infrastructure**: Google Cloud Project (Apps Script API, OAuth Consent) + GitHub + GitHub Actions (clasp push/deploy) + Gemini API / Vertex AI

## Patterns & Conventions
N/A — greenfield project (patterns จะถูกกำหนดใน design phase; ข้อกำหนดหลักมาจาก steering: TypeScript, ESLint, camelCase/PascalCase/UPPER_SNAKE_CASE, try/catch ทุก async)

## Codebase Analysis
N/A — greenfield project (ยังไม่มี source code เดิม มีเพียงเอกสาร requirement ใน `initial-requirements/`)

## Feature Impact

**Affected Areas**: New standalone — สร้างโปรเจกต์ Apps Script ใหม่ทั้งหมดแบบ code-first

| Area | Impact | Reason |
|------|--------|--------|
| Apps Script Project (src/) | New | โค้ด TypeScript สำหรับ Add-on, Web App, Triggers, บริการ AI |
| Google Sheets (Data Store) | New | Log Sheet, Config Sheet, Prompt Template Registry, Dashboard |
| Script Properties | New | เก็บ API Key / Secret / Config (ไม่ commit ลง Git) |
| appsscript.json (manifest) | New | OAuth Scope (least privilege), Add-on config, runtime |
| GitHub Actions (CI/CD) | New | Lint + Test + clasp push/deploy อัตโนมัติ |
| Gemini API integration | New | เรียกผ่าน UrlFetchApp พร้อม retry/backoff |

## Recommendations

- Story Count: Medium (7-9) — 4 FR หลัก + NFR ที่มี user-facing behavior (auth, monitoring dashboard)
- Domain Boundaries: 3 domain — AI Assistant (สรุป/ร่าง), Automation (trigger/schedule), DevOps (clasp/CI-CD)
- User Types: 4 — End User, Automation Owner, Developer, Admin (+ External System: Gemini API)
- Integration Points: Gemini API / Vertex API, Gmail, Docs, Sheets, Calendar, Google Chat, GitHub Actions
- **Personas**: Yes — มีผู้ใช้หลายกลุ่มที่มีเป้าหมาย/สิทธิ์ต่างกันชัดเจน (End User vs Owner vs Developer vs Admin)
- **Units**: No — เป็น GAS app ก้อนเดียวที่ deploy รวมกัน และตามนโยบาย hands-on-project ให้ข้าม decomposition (ไม่ซอยเป็น units)
- **NFR**: Yes — มี NFR สำคัญ 5 ข้อ (Auth, Security/Compliance, Performance/Quota, Monitoring, Maintainability) ที่ต้องออกแบบเป็นการเฉพาะ

## Scope

- **Detected scope**: new
- **Rationale**: เอกสาร requirement ระบุชัดว่าเป็น Greenfield "build from scratch" ไม่มี source code เดิมใน workspace
- **Phases skipped**: decomposition (ตามนโยบาย hands-on-project — พัฒนาเป็น app ก้อนเดียว ไม่ซอย units)

## Recommended Workflow

```
        ┌─────────────┐
        │   Context   │  ✅ (คุณอยู่ที่นี่)
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │ Requirements│   User stories + EARS (FR/NFR/EX/BR)
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │   Design    │   D3 tech decisions + architecture + data model
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │    Tasks    │   แตกงานเป็น task + execution waves
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │  Implement  │   เขียนโค้ด TypeScript + Google Sheets mock → จริง
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │ Build & Test│   compile + lint + test + verify
        └──────┬──────┘
               ▼
        ┌─────────────┐
        │   Deploy    │   clasp push/deploy + GitHub Actions (optional)
        └─────────────┘

(decomposition ถูกข้ามตามนโยบาย hands-on-project)
```

## External References

| Source | Type | What was used |
|--------|------|---------------|
| `initial-requirements/project-requirements/Usecase 2 - clasp + gas + ai.md` | Requirement doc (SRS) | FR/NFR/EX/BR, Tech Stack, User Classes, Constraints — แหล่งความจริงหลัก |
