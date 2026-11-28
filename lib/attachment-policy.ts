export const CASE_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;

export const CASE_ATTACHMENT_ACCEPT = CASE_ATTACHMENT_MIME_TYPES.join(',');
export const CASE_ATTACHMENT_MAX_FILES = 10;
export const CASE_ATTACHMENT_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const CASE_ATTACHMENT_MAX_TOTAL_BYTES = 8 * 1024 * 1024;
