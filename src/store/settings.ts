export type Settings = {
  maxStars: number;
};

const DEFAULT_SETTINGS: Settings = {
  maxStars: 5,
};

export const SETTINGS_KEY = "tabDeath:v1.settings";

export const loadSettings = async (): Promise<Settings> => {
  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  const candidate = stored?.[SETTINGS_KEY] as Partial<Settings> | undefined;
  return {
    ...DEFAULT_SETTINGS,
    ...candidate,
  };
};
