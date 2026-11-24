export interface WorkspacePreferences {
  pageSize: 10 | 25 | 50 | 100;
  showLawFirmWidget: boolean;
  enableSounds: boolean;
  enableNotifications: boolean;
}

export const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  pageSize: 50,
  showLawFirmWidget: true,
  enableSounds: false,
  enableNotifications: false,
};

const STORAGE_KEY = 'brandex_workspace_preferences_v1';

export function readWorkspacePreferences(): WorkspacePreferences {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_PREFERENCES;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<WorkspacePreferences>;
    const allowedPageSizes = [10, 25, 50, 100];
    const pageSize = allowedPageSizes.includes(Number(parsed.pageSize))
      ? Number(parsed.pageSize) as WorkspacePreferences['pageSize']
      : DEFAULT_WORKSPACE_PREFERENCES.pageSize;
    return {
      pageSize,
      enableSounds: parsed.enableSounds === true,
      enableNotifications: parsed.enableNotifications === true,
      showLawFirmWidget: typeof parsed.showLawFirmWidget === 'boolean'
        ? parsed.showLawFirmWidget
        : DEFAULT_WORKSPACE_PREFERENCES.showLawFirmWidget,
    };
  } catch {
    return DEFAULT_WORKSPACE_PREFERENCES;
  }
}

export function saveWorkspacePreferences(preferences: WorkspacePreferences): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
