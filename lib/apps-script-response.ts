export interface AppsScriptFailure {
  code?: 'GOOGLE_DOCS_PERMISSION_REQUIRED' | 'APPS_SCRIPT_AUTHENTICATION_FAILED';
  error: string;
}

export function describeAppsScriptFailure(upstreamError: string): AppsScriptFailure {
  if (/DocumentApp|permissions are not sufficient|auth\/documents/i.test(upstreamError)) {
    return {
      code: 'GOOGLE_DOCS_PERMISSION_REQUIRED',
      error: 'Google Docs authorization is required. Follow the permission setup instructions.',
    };
  }

  if (/authentication required|unauthorized|invalid token/i.test(upstreamError)) {
    return {
      code: 'APPS_SCRIPT_AUTHENTICATION_FAILED',
      error: 'Apps Script rejected the backend token. Make APPS_SCRIPT_RECORDS_TOKEN and the Apps Script RECORDS_ACCESS_TOKEN property identical.',
    };
  }

  return { error: 'Apps Script request failed.' };
}
