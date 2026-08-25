// SecretManager — อ่าน/เขียน Script Properties เท่านั้น (Ref: NFR-02, US-009, D3-9)
import { AppError } from './errors';

export class SecretManager {
  private props(): GoogleAppsScript.Properties.Properties {
    return PropertiesService.getScriptProperties();
  }

  get(key: string): string | null {
    return this.props().getProperty(key);
  }

  /** คืนค่าที่จำเป็น; ถ้าไม่มี throw (message มีแค่ชื่อ key ไม่ใช่ค่า secret) */
  require(key: string): string {
    const value = this.props().getProperty(key);
    if (!value) throw new AppError('INTERNAL', `Missing required Script Property: ${key}`);
    return value;
  }

  set(key: string, value: string): void {
    this.props().setProperty(key, value);
  }

  has(key: string): boolean {
    return this.props().getProperty(key) !== null;
  }
}

export const secretManager = new SecretManager();
