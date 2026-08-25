# Product

## Summary
- **Product**: ระบบผู้ช่วยงานอัตโนมัติบน Google Workspace ด้วย AI (APP-03) — ช่วยพนักงานสรุป/ค้นหา/ร่างเอกสารและอีเมลด้วย AI จากเครื่องมือที่ใช้ทุกวัน
- **Users**: End User (พนักงาน), Automation Owner, Developer, Admin
- **Type + Scope**: Greenfield / New product

## Overview
แพลตฟอร์มผู้ช่วยงานอัตโนมัติที่ทำงานภายใน Google Workspace ขององค์กร ให้พนักงานสรุปอีเมล/เอกสาร ร่างข้อความตอบกลับ และตั้งงานอัตโนมัติด้วย AI (Gemini) ได้จาก Gmail/Docs/Sheets โดยตรง ทีมพัฒนาดูแลโค้ดแบบ code-first ด้วย clasp + Git แทนการแก้ใน Apps Script Web Editor และ deploy อัตโนมัติผ่าน GitHub Actions ส่งมอบเป็น Google Workspace Add-on + Web App

## Problem Statement
- **ปัญหา**: งานสรุป/ร่าง/แปลเนื้อหาในอีเมลและเอกสารใช้เวลามากและทำซ้ำ ๆ พนักงานต้องสลับเครื่องมือหลายตัว
- **Pain point ปัจจุบัน**: ไม่มีผู้ช่วย AI ในเครื่องมือที่ใช้อยู่, การพัฒนา Apps Script แบบแก้ใน Web Editor ควบคุมเวอร์ชันยากและเสี่ยงต่อความผิดพลาด/โค้ดหาย
- **Gap**: ขาดระบบที่รวม AI เข้ากับ Google Workspace อย่างปลอดภัย (HITL, least privilege) พร้อมกระบวนการ deploy ที่ตรวจสอบย้อนกลับได้

## Target Users
- **End User (พนักงาน)**: เรียกใช้ Add-on ใน Gmail/Docs/Sheets เพื่อสรุป ร่าง และแปลเนื้อหาด้วย AI — เป้าหมาย: ทำงานเอกสาร/อีเมลเร็วขึ้นโดยยังตรวจสอบเองก่อนส่ง
- **Automation Owner (เจ้าของกระบวนการ)**: ตั้งค่า Prompt Template และ Trigger งานอัตโนมัติของทีม — เป้าหมาย: ทำงานประจำให้เป็นอัตโนมัติตามเวลา
- **Developer**: พัฒนา/ทดสอบโค้ด TypeScript แล้ว push/deploy ด้วย clasp ผ่าน Git — เป้าหมาย: ดูแลโค้ดแบบ code-first มีคุณภาพและ rollback ได้
- **Admin**: จัดการ OAuth Scope, API Key, โควต้า และตรวจ Audit Log — เป้าหมาย: ควบคุมความปลอดภัยและการปฏิบัติตามนโยบาย
- **External System (Gemini API / Vertex AI)**: ประมวลผลภาษาธรรมชาติ (สรุป/ร่าง/แปล)

## Key Features
- **AI Assistant — สรุปเนื้อหา (FR-01)**: สรุป Gmail Thread / Google Docs ผ่าน Add-on, แสดงผลในการ์ด, คัดลอก/แทรกกลับได้, บันทึก Log
- **AI Assistant — ร่างข้อความตอบกลับ (FR-02)**: เลือกโทน/ภาษา, สร้างเป็น Gmail Draft เท่านั้น (ไม่ส่งอัตโนมัติ), Human-in-the-loop
- **Automation — ตั้งงานอัตโนมัติ (FR-03)**: Time-driven Trigger รายชั่วโมง/รายวัน, เลือก Prompt Template + ปลายทาง (Sheets/Docs/Chat), เริ่ม/หยุด/ลบ/ดูสถานะ
- **DevOps (clasp) — Deploy code-first (FR-04)**: เขียน TypeScript ใน Git → clasp push, GitHub Actions lint+test แล้ว clasp deploy เมื่อ merge main, เก็บ Deployment ID + Release Note + rollback
- **Dashboard & Monitoring (NFR-04)**: สรุปการใช้งาน/โควต้า/Token บน Google Sheets + แจ้งเตือน Error
- **Prompt Template Registry (NFR-05)**: แม่แบบคำสั่ง AI จัดเก็บและนำกลับมาใช้ได้

## Domain Language
| Term | Definition | Example |
|---|---|---|
| clasp | CLI สำหรับ push/pull/deploy โค้ด Google Apps Script | `clasp push`, `clasp deploy` |
| GAS | Google Apps Script | runtime V8 |
| Add-on | ส่วนขยายที่ทำงานใน Gmail/Docs/Sheets (CardService) | การ์ดผู้ช่วย AI ใน Gmail |
| Trigger | ตัวกระตุ้นการทำงานตามเวลา/เหตุการณ์ | Time-driven รายวัน |
| Prompt Template | แม่แบบคำสั่งที่ส่งให้ AI | "สรุปอีเมลนี้เป็นภาษาไทยแบบกระชับ" |
| Deployment ID | รหัสเวอร์ชันที่ deploy | ใช้ rollback |
| Script Properties | ที่เก็บค่าคอนฟิก/ความลับของ Apps Script | เก็บ Gemini API Key |
| HITL | Human-in-the-loop — คนตรวจก่อนใช้งานจริง | ผู้ใช้กดส่ง Draft เอง |

## Success Criteria
- ผู้ใช้กดสรุปแล้วเห็นผลภายใน 15 วินาที หรือได้รับข้อความ timeout ที่เข้าใจง่ายพร้อมลองใหม่ (FR-01/NFR-03)
- AI ไม่ส่งอีเมล/เผยแพร่เอกสารอัตโนมัติทุกกรณี — ผ่าน HITL 100% (BR-01/FR-02)
- Deploy ผ่าน clasp + GitHub Actions โดยไม่แก้ผ่าน Web Editor และ rollback ได้ (FR-04/EX-02)
- ไม่มี API Key / Secret หลุดลง Git (NFR-02)
- (ตัวเลขเป้าหมายเชิงปริมาณอื่น ๆ) To be defined during requirements phase

## Constraints & Assumptions
- **Constraints**:
  - Apps Script: เวลาประมวลผลสูงสุด 6 นาที/ครั้ง และมีโควต้า UrlFetch/Email ต่อวัน
  - API Key/Secret ต้องอยู่ใน Script Properties ห้าม hardcode/commit
  - พัฒนาแบบ code-first ด้วย clasp + TypeScript + Git เท่านั้น (ห้ามแก้ผ่าน Web Editor)
  - OAuth Scope ขอเท่าที่จำเป็น (least privilege) ผ่าน Google Cloud Project
  - ปฏิบัติตาม PDPA และห้ามส่งข้อมูลชั้นความลับสูง/PII อ่อนไหวออก AI ภายนอก (BR-02)
- **Assumptions**:
  - ผู้ใช้มีบัญชี Google Workspace ขององค์กรและเชื่อมต่ออินเทอร์เน็ต
  - จำกัดการใช้งานเฉพาะโดเมนขององค์กร

## Existing User Journeys
N/A — greenfield project

## Project Type
- **Type**: Greenfield
- **Scope**: New product
