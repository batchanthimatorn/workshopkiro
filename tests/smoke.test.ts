// Smoke test — ยืนยันว่า toolchain (Jest + ts-jest) ทำงาน (Phase 1 setup)
// tests จริงต่อ component จะเพิ่มใน Phase 9

describe('toolchain smoke', () => {
  it('runs TypeScript tests via ts-jest', () => {
    expect(1 + 1).toBe(2);
  });

  it('supports async', async () => {
    const value = await Promise.resolve('ok');
    expect(value).toBe('ok');
  });
});
