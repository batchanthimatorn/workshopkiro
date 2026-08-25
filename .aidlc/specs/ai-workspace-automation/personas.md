# Personas

## Summary
<!-- Compact digest for downstream phases. -->
- **User Types**: 4 personas
- **Key Roles**: End User (พนักงาน), Automation Owner, Developer, Admin
- **Design Implications**: ต้องมี RBAC ตามบทบาท (least privilege), Human-in-the-loop ก่อนส่งทุกครั้ง, UI แบบ Add-on การ์ดที่เรียบง่ายสำหรับ End User, Dashboard สำหรับ Admin/Developer

## Overview
ระบบให้บริการผู้ใช้ 4 กลุ่มที่มีเป้าหมายและสิทธิ์ต่างกันชัดเจน External System (Gemini API) ไม่นับเป็น persona แต่เป็น integration point

---

## End User (พนักงาน)

**Role**: พนักงานทั่วไปในองค์กรที่ใช้ Gmail/Docs เป็นประจำ

**Goals**:
- สรุปอีเมล/เอกสารยาว ๆ ให้เข้าใจเร็วภายในไม่กี่วินาที
- ร่างข้อความตอบกลับอีเมลด้วยโทน/ภาษาที่เหมาะสม โดยยังตรวจแก้เองก่อนส่ง

**Pain Points**:
- อ่านอีเมล/เอกสารยาวเสียเวลา ต้องสลับแท็บไปใช้เครื่องมือ AI ภายนอก
- กังวลว่าจะเผลอส่งข้อความที่ AI สร้างโดยไม่ได้ตรวจ

**User Journey**: เปิดอีเมล/เอกสาร → กดปุ่มใน Add-on (สรุป/ร่าง) → รับผลในการ์ด → คัดลอก/แทรก หรือสร้างเป็น Draft → ตรวจแล้วส่งเอง

**Implications**: UI การ์ดต้องเรียบง่าย กดไม่กี่ปุ่ม, ผลต้องมาเร็ว (≤15 วินาที) หรือแจ้ง timeout, ผลร่างต้องเป็น Draft เท่านั้น (ไม่ส่งเอง)

---

## Automation Owner (เจ้าของกระบวนการ)

**Role**: หัวหน้าทีม/ผู้ดูแลกระบวนการที่ต้องการทำงานประจำให้อัตโนมัติ

**Goals**:
- ตั้งงานอัตโนมัติตามเวลา (รายชั่วโมง/รายวัน) เช่น สรุปรายงานประจำวัน
- เลือก Prompt Template และปลายทางผลลัพธ์ (Sheets/Docs) และดูสถานะการรัน

**Pain Points**:
- งานสรุป/รวบรวมประจำต้องทำเองซ้ำ ๆ ทุกวัน
- ไม่รู้ว่างานอัตโนมัติรันสำเร็จหรือล้มเหลว

**User Journey**: เข้าหน้าตั้งค่า Automation → เลือก Prompt Template + ความถี่ + ปลายทาง → เริ่มงาน → ดูสถานะ/log การรันล่าสุด → หยุด/ลบเมื่อไม่ใช้

**Implications**: ต้องมีหน้าจัดการ Trigger (สร้าง/เริ่ม/หยุด/ลบ/ดูสถานะ), จำกัดจำนวน Trigger ไม่เกินโควต้า Apps Script, ต้องมี Prompt Template Registry

---

## Developer

**Role**: นักพัฒนาที่ดูแลโค้ดแบบ code-first ด้วย clasp + Git

**Goals**:
- เขียน/ทดสอบ TypeScript ใน Git แล้ว push/deploy ด้วย clasp
- มี lint/test อัตโนมัติก่อน deploy และ rollback กลับเวอร์ชันเดิมได้

**Pain Points**:
- การแก้โค้ดผ่าน Apps Script Web Editor ควบคุมเวอร์ชันยากและเสี่ยงโค้ดหาย/ทับกัน
- Deploy ผิดพลาดแล้วย้อนกลับยาก

**User Journey**: แก้โค้ดใน branch → เปิด PR → CI รัน lint/test → merge main → clasp deploy สร้างเวอร์ชันใหม่ + Release Note → rollback ได้ถ้าพัง

**Implications**: โครง repo มาตรฐาน (src/, tests/, appsscript.json), ESLint + Unit Test, GitHub Actions pipeline, เก็บ Deployment ID + Release Note ทุกเวอร์ชัน, ห้ามแก้ผ่าน Web Editor

---

## Admin

**Role**: ผู้ดูแลระบบ/ความปลอดภัยขององค์กร

**Goals**:
- จัดการ OAuth Scope, API Key/Secret, โควต้า และรายการข้อมูลต้องห้าม (Config)
- ตรวจ Audit Log และ Dashboard การใช้งาน/Token และรับแจ้งเตือน error

**Pain Points**:
- ความลับ (API Key) อาจหลุดลง Git ถ้าไม่มีการควบคุม
- ไม่มีภาพรวมการใช้งาน AI และไม่รู้เมื่อ Job ล้มเหลว

**User Journey**: ตั้งค่า Secret ใน Script Properties + Config Sheet (allowed domain, คำต้องห้าม) → ตรวจ Dashboard การใช้งาน/โควต้า → ดู Audit Log → รับแจ้งเตือน error ทาง Email/Chat

**Implications**: ต้องมี Config Sheet + Dashboard Sheet, Audit Log ที่ไม่เก็บเนื้อหาส่วนบุคคล, การแจ้งเตือน error, จำกัดสิทธิ์ตามบทบาท (least privilege), จำกัดเฉพาะโดเมนองค์กร

---

## Design Implications

- **Architecture**: ต้องมี RBAC/ควบคุมสิทธิ์ตามบทบาท (End User ใช้ได้เฉพาะ Add-on ของตน, Automation Owner จัดการ Trigger, Admin จัดการ config/secret/audit, Developer จัดการ deploy) ตามหลัก least privilege
- **UI/UX**: Add-on การ์ด (CardService) ที่เรียบง่ายสำหรับ End User; หน้าตั้งค่า Automation สำหรับ Owner; Web App Dashboard สำหรับ Admin/Developer
- **Data & Privacy**: Audit Log บันทึกผู้ใช้/เวลา/ประเภทงาน โดยไม่เก็บเนื้อหาส่วนบุคคล (PDPA), ตัวกรองข้อมูลต้องห้ามก่อนส่ง AI (BR-02), Secret เก็บใน Script Properties เท่านั้น
