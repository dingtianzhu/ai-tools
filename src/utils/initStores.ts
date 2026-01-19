// Store initialization utility
// Loads persisted data from Tauri Plugin Store on app startup

import { useSettingsStore } from '@/stores/settings';
import { useProjectStore } from '@/stores/project';
import { useRuntimeStore } from '@/stores/runtime';

/**
 * Initialize all stores by loading persisted data
 * Should be called once on app startup
 */
export async function initializeStores(): Promise<void> {
  console.log('Initializing stores from persistent storage...');

  try {
    // Load settings
    const settingsStore = useSettingsStore();
    await settingsStore.loadFromStore();
    console.log('✓ Settings loaded');

    // Load projects
    const projectStore = useProjectStore();
    await projectStore.loadFromStore();
    console.log('✓ Projects loaded');

    // Load runtimes
    const runtimeStore = useRuntimeStore();
    await runtimeStore.loadFromStore();
    console.log('✓ Runtimes loaded');

    console.log('All stores initialized successfully');
  } catch (error) {
    console.error('Failed to initialize stores:', error);
    // Don't throw - allow app to continue with default values
  }
}
