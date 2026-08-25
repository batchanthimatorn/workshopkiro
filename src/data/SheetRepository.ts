// Base repository over SpreadsheetApp (typed, header-based mapping) — Ref: design/components.md C17, D3-4
import { secretManager } from '../core/secret';

export abstract class SheetRepository<T extends object> {
  protected abstract sheetName: string;
  protected abstract headers: string[];

  private spreadsheet(): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const id = secretManager.require('SPREADSHEET_ID');
    return SpreadsheetApp.openById(id);
  }

  /** เปิด (หรือสร้าง) แท็บ + header ถ้ายังไม่มี */
  protected sheet(): GoogleAppsScript.Spreadsheet.Sheet {
    const ss = this.spreadsheet();
    let sh = ss.getSheetByName(this.sheetName);
    if (!sh) {
      sh = ss.insertSheet(this.sheetName);
      sh.appendRow(this.headers);
    } else if (sh.getLastRow() === 0) {
      sh.appendRow(this.headers);
    }
    return sh;
  }

  /** สร้างแท็บ + header (ใช้ตอน init) */
  ensure(): void {
    this.sheet();
  }

  protected toRow(obj: T): unknown[] {
    const rec = obj as unknown as Record<string, unknown>;
    return this.headers.map((h) => {
      const v = rec[h];
      return v === undefined || v === null ? '' : v;
    });
  }

  protected fromRow(row: unknown[]): T {
    const obj: Record<string, unknown> = {};
    this.headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj as unknown as T;
  }

  readAll(): T[] {
    const sh = this.sheet();
    const last = sh.getLastRow();
    if (last <= 1) return [];
    const values = sh.getRange(2, 1, last - 1, this.headers.length).getValues();
    return values.map((r) => this.fromRow(r as unknown[]));
  }

  append(obj: T): void {
    this.sheet().appendRow(this.toRow(obj));
  }

  /** เขียนภายใต้ lock กัน race (Apps Script single-thread ต่อ execution) */
  protected withLock<R>(fn: () => R): R {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }
}
