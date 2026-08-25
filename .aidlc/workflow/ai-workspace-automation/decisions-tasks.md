# Tasks Decisions (D4)

## Context Summary
- **Design**: 18 components, 6 sheet entities, Web App + Add-on + AI JSON contract, 5 integrations
- **Stack**: TypeScript+clasp / Google Sheets / Gemini (mock-first) — Layered serverless
- **Team**: Solo · **Testing (D3)**: Jest + fast-check (example-based + property เฉพาะ filter/backoff)
- **นโยบาย hands-on-project**: ลำดับ Setup → FE+mock → FE+backend/real → อื่น ๆ → test/verify → deploy(last); ทำทีละ task; deploy optional ท้ายสุด

---

## Decision Answers
- **D4-1 Build Order**: 1
- **D4-2 Task Breakdown**: 1
- **D4-3 Impl Approach**: 1
- **D4-4 Integration Strategy**: 1
- **D4-5 Test Tasks**: 1
- **D4-6 Execution**: 1
- **D4-7 CI/CD & Deploy**: 1

---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream phases: read ONLY this section. -->
- D4-1 Build Order: Setup → Add-on/WebApp UI + mock → ต่อ AI/Sheets จริง → security/monitoring → CI/CD/deploy (hands-on order)
- D4-2 Task Breakdown: layer/feature ผสม — Setup + แต่ละ service/feature เป็น task + cross-cutting แยก (~1-2 วัน)
- D4-3 Impl Approach: Test-after
- D4-4 Integration Strategy: Mock-first (MockProvider + fixtures) แล้วสลับ Gemini จริงผ่าน config
- D4-5 Test Tasks: unit แนบท้าย feature + property test เฉพาะ filter/backoff/masking + verify ท้าย wave
- D4-6 Execution: Sequential ทีละ task ตาม dependency
- D4-7 CI/CD & Deploy: wave สุดท้าย/optional หลัง core ใช้งานได้จริง

---

## Validation Notes (D4)
- ✅ Testing framework (D3) มี test tasks รองรับ (D4-5) — ไม่ trigger "Testing Framework Without Test Tasks"
- ✅ PBT (D3-11) มี property test task (filter/backoff/masking) — ครบ
- ✅ Sequential execution (solo) — ไม่ trigger "Parallel Dev Without Coordination"
- ✅ CI/CD (D3) มี task wave สุดท้าย (D4-7) — ไม่ trigger "CI/CD Without Pipeline Tasks"
- ✅ Data store (Sheets) มี task init sheet/schema (setup + data layer) — ครอบ "DB Without Migration Tasks" (ในบริบท GAS = init header)
- ✅ ไม่มี cloud IaC แบบดั้งเดิม (serverless GAS) — "Cloud Deploy Without Infra Tasks" ไม่ applicable
- ไม่พบ conflict
