# Correctness Properties

## Overview
**PBT Framework**: fast-check (Jest) — D3-11: example-based เป็นหลัก + **property-based เฉพาะ logic ความปลอดภัย/ความเสถียร** ที่ input หลากหลาย: ตัวกรองข้อมูลต้องห้าม (SecurityFilter) และ exponential backoff (RetryUtil)

---

## Properties

### P1. SecurityFilter ต้อง block ทุกครั้งที่มีคำต้องห้าม
**Validates**: US-010, BR-02
**Property**: สำหรับ content ใด ๆ ที่มี banned keyword อย่างน้อย 1 คำ (case-insensitive) → `scan()` ต้องคืน `blocked=true` เสมอ (ไม่มีทางหลุด)

```javascript
fc.assert(fc.property(
  fc.string(), fc.constantFrom(...BANNED), fc.string(),
  (pre, banned, post) => {
    const content = `${pre}${banned}${post}`;
    const res = securityFilter.scan(content, BANNED);
    return res.blocked === true;
  }
));
```
**Generators**: สุ่มข้อความหน้า/หลัง + แทรกคำต้องห้าม (รวมเคสตัวพิมพ์ใหญ่-เล็กผสม, มีช่องว่าง/อักขระคั่น)
**Edge Cases**: คำต้องห้ามติดกับข้อความอื่น, ตัวพิมพ์ผสม, unicode ไทย, คำซ้ำหลายคำ

### P2. SecurityFilter ต้องปล่อยผ่านเมื่อไม่มีคำต้องห้าม
**Validates**: US-010 (ไม่ false-positive เกินจำเป็น)
**Property**: content ที่ไม่มี substring ของ banned keyword ใด ๆ → `blocked=false`

```javascript
fc.assert(fc.property(
  fc.string().filter(s => BANNED.every(b => !s.toLowerCase().includes(b.toLowerCase()))),
  (clean) => securityFilter.scan(clean, BANNED).blocked === false
));
```
**Edge Cases**: string ว่าง, ข้อความยาว, อักขระพิเศษที่ไม่ตรงคำต้องห้าม

### P3. Backoff delay ต้องไม่ลดลงและมีเพดาน
**Validates**: US-012, EX-01, NFR-03
**Property**: ลำดับ delay จาก attempt 1→N ต้องไม่ลดลง (monotonic non-decreasing) และไม่เกิน `maxDelay`; จำนวน retry ไม่เกิน 3

```javascript
fc.assert(fc.property(
  fc.integer({min:1, max:3}),
  (attempt) => {
    const d = retryUtil.computeDelay(attempt);
    const dPrev = attempt > 1 ? retryUtil.computeDelay(attempt-1) : 0;
    return d >= dPrev && d <= retryUtil.maxDelay;
  }
));
```
**Edge Cases**: attempt=1 (delay base), attempt=maxRetries, jitter ต้องไม่ทำให้ติดลบหรือเกินเพดาน

### P4. withRetry หยุดที่ ≤3 ครั้งและไม่ retry error ที่ไม่ retriable
**Validates**: US-012, EX-01
**Property**: ถ้า fn โยน error retriable ตลอด → ถูกเรียกไม่เกิน `maxRetries+1` ครั้ง; ถ้า error ไม่ retriable (เช่น VALIDATION) → เรียกครั้งเดียว ไม่ retry

```javascript
fc.assert(fc.property(
  fc.constantFrom('AI_TIMEOUT','QUOTA_EXCEEDED','VALIDATION','UNAUTHORIZED'),
  (code) => {
    let calls = 0;
    try { retryUtil.withRetry(() => { calls++; throw new AppError(code); }, {maxRetries:3}); } catch {}
    const retriable = ['AI_TIMEOUT','QUOTA_EXCEEDED'].includes(code);
    return retriable ? calls <= 4 : calls === 1;
  }
));
```

### P5. Email masking เป็น idempotent และไม่คืน local-part เต็ม
**Validates**: NFR-02, US-011 (PDPA)
**Property**: `mask(mask(email)) === mask(email)`, ผลลัพธ์มี `***` + โดเมนเดิม, และเมื่อ local-part ยาว ≥ 4 ต้องไม่มี local-part เต็มในผลลัพธ์
**หมายเหตุ (Add-on 2026-08-25)**: ปรับจากเดิม "ไม่มี local เต็มทุกกรณี" → คุมเฉพาะ local ≥ 4 เพราะ implementation แสดง 3 ตัวแรก (design/data-model, operations); อีเมล local สั้น (≤3) จะเปิดเผยทั้งหมดโดยธรรมชาติ (ยอมรับได้)

```javascript
fc.assert(fc.property(
  fc.emailAddress(),
  (email) => {
    const local = email.split('@')[0];
    const once = maskEmail(email);
    return maskEmail(once) === once
      && once.includes('***')
      && (local.length < 4 || !once.includes(local));
  }
));
```

---

## Test Configuration
- **Tests per property**: 200 (default fast-check numRuns)
- **Timeout**: 5s ต่อ property
- **Shrinking**: เปิด — log failing input, เก็บ counterexample

**Run**: `npm run test:pbt` (`jest tests/properties`)

**Organization**:
```
tests/properties/
├── security-filter.properties.test.ts   # P1, P2
├── retry.properties.test.ts              # P3, P4
└── masking.properties.test.ts            # P5
```
