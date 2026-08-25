// AppError + user-safe messages (Ref: design/operations.md Error, requirements EX-01)

export type ErrorCode =
  | 'AI_TIMEOUT'
  | 'QUOTA_EXCEEDED'
  | 'UNAUTHORIZED'
  | 'DOMAIN_FORBIDDEN'
  | 'BLOCKED_SENSITIVE'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'INTERNAL';

const RETRIABLE: ErrorCode[] = ['AI_TIMEOUT', 'QUOTA_EXCEEDED'];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retriable: boolean;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.retriable = RETRIABLE.includes(code);
  }
}

// ข้อความสำหรับผู้ใช้ — ไม่มี stack trace, ไม่เปิดเผยรายละเอียดภายใน (EX-01)
const USER_MESSAGES: Record<ErrorCode, string> = {
  AI_TIMEOUT: 'ระบบ AI ตอบสนองช้าเกินไป กรุณาลองใหม่อีกครั้ง',
  QUOTA_EXCEEDED: 'ใช้งาน AI เกินโควต้าชั่วคราว กรุณาลองใหม่ภายหลัง',
  UNAUTHORIZED: 'คุณไม่มีสิทธิ์ใช้งานส่วนนี้',
  DOMAIN_FORBIDDEN: 'บัญชีนี้อยู่นอกโดเมนที่อนุญาต',
  BLOCKED_SENSITIVE: 'พบข้อมูลที่อาจเป็นความลับหรือข้อมูลส่วนบุคคล กรุณาตรวจสอบก่อนดำเนินการ',
  VALIDATION: 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  INTERNAL: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง',
};

export function toUserMessage(err: unknown): string {
  if (err instanceof AppError) return USER_MESSAGES[err.code];
  return USER_MESSAGES.INTERNAL;
}
