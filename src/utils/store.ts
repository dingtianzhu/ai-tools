// Store utility - Frontend interface for Tauri Plugin Store
// Provides type-safe access to persistent configuration storage

import { invoke } from '@tauri-apps/api/core';

// Settings data structure matching Rust backend
export interface SettingsData {
  version: number;
  theme: string;
  language: string;
  editorFontSize: number;
  autoSave: boolean;
  panelSizes: {
    navigation: number;
    main: number;
    context: number;
  };
  keyboardShortcuts: Record<string, string>;
  tokenLimits: Record<string, number>;
}

// Projects data structure matching Rust backend
export interface ProjectsData {
  version: number;
  projects: Array<{
    id: string;
    name: string;
    path: string;
    lastOpened: number;
    aiToolsUsed: string[];
    gitignoreRules?: string[];
  }>;
  recentProjects: string[]; // project IDs
}

// Runtimes data structure matching Rust backend
export interface RuntimesData {
  version: number;
  customRuntimes: Array<{
    id: string;
    name: string;
    type: string;
    executablePath: string;
    version: string | null;
    status: string;
    lastChecked: number;
  }>;
  lastScan: number;
}

/**
 * Load settings from settings.json
 */
export async function loadSettings(): Promise<SettingsData> {
  try {
    return await invoke<SettingsData>('load_settings');
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Return default settings on error
    return {
      version: 1,
      theme: 'system',
      language: 'zh-CN',
      editorFontSize: 14,
      autoSave: true,
      panelSizes: {
        navigation: 250,
        main: 600,
        context: 300,
      },
      keyboardShortcuts: {
        new_session: 'Ctrl+N',
        search: 'Ctrl+F',
        command_palette: 'Ctrl+K',
      },
      tokenLimits: {
        'gpt-4': 8192,
        'gpt-3.5-turbo': 4096,
      },
    };
  }
}

/**
 * Save settings to settings.json
 */
export async function saveSettings(settings: SettingsData): Promise<void> {
  try {
    await invoke('save_settings', { settings });
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Load projects from projects.json
 */
export async function loadProjects(): Promise<ProjectsData> {
  try {
    return await invoke<ProjectsData>('load_projects');
  } catch (error) {
    console.error('Failed to load projects:', error);
    // Return default projects on error
    return {
      version: 1,
      projects: [],
      recentProjects: [],
    };
  }
}

/**
 * Save projects to projects.json
 */
export async function saveProjects(projects: ProjectsData): Promise<void> {
  try {
    await invoke('save_projects', { projects });
  } catch (error) {
    console.error('Failed to save projects:', error);
    throw error;
  }
}

/**
 * Load runtimes from runtimes.json
 */
export async function loadRuntimes(): Promise<RuntimesData> {
  try {
    return await invoke<RuntimesData>('load_runtimes');
  } catch (error) {
    console.error('Failed to load runtimes:', error);
    // Return default runtimes on error
    return {
      version: 1,
      customRuntimes: [],
      lastScan: 0,
    };
  }
}

/**
 * Save runtimes to runtimes.json
 */
export async function saveRuntimes(runtimes: RuntimesData): Promise<void> {
  try {
    await invoke('save_runtimes', { runtimes });
  } catch (error) {
    console.error('Failed to save runtimes:', error);
    throw error;
  }
}
