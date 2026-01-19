import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PromptTemplate, ThemeMode } from '@/types';
import { loadSettings, saveSettings, type SettingsData } from '@/utils/store';

export const useSettingsStore = defineStore('settings', () => {
  // State
  const theme = ref<ThemeMode>('system');
  const language = ref<string>('zh-CN');
  const editorFontSize = ref<number>(14);
  const autoSave = ref<boolean>(true);
  const promptTemplates = ref<PromptTemplate[]>([]);
  const panelSizes = ref({
    navigation: 250,
    main: 600,
    context: 300,
  });
  const keyboardShortcuts = ref<Record<string, string>>({
    new_session: 'Ctrl+N',
    search: 'Ctrl+F',
    command_palette: 'Ctrl+K',
  });
  const tokenLimits = ref<Record<string, number>>({
    'gpt-4': 8192,
    'gpt-3.5-turbo': 4096,
  });

  // Watch theme changes and apply to document
  watch(theme, (newTheme) => {
    applyTheme(newTheme);
  }, { immediate: true });

  // Auto-save settings when they change
  watch(
    [theme, language, editorFontSize, autoSave, panelSizes, keyboardShortcuts, tokenLimits],
    async () => {
      if (autoSave.value) {
        await persistSettings();
      }
    },
    { deep: true }
  );

  // Actions
  function setTheme(newTheme: ThemeMode): void {
    theme.value = newTheme;
  }

  function applyTheme(themeMode: ThemeMode): void {
    const root = document.documentElement;
    
    if (themeMode === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    } else {
      root.classList.toggle('dark', themeMode === 'dark');
    }
  }

  function setLanguage(newLanguage: string): void {
    language.value = newLanguage;
  }

  function setEditorFontSize(size: number): void {
    editorFontSize.value = Math.max(10, Math.min(24, size));
  }

  function setAutoSave(enabled: boolean): void {
    autoSave.value = enabled;
  }

  function setPanelSizes(sizes: { navigation: number; main: number; context: number }): void {
    panelSizes.value = sizes;
  }

  function setKeyboardShortcut(action: string, shortcut: string): void {
    keyboardShortcuts.value[action] = shortcut;
  }

  function setTokenLimit(modelType: string, limit: number): void {
    tokenLimits.value[modelType] = limit;
  }

  function addPromptTemplate(template: PromptTemplate): void {
    const existing = promptTemplates.value.findIndex(t => t.id === template.id);
    if (existing >= 0) {
      promptTemplates.value[existing] = template;
    } else {
      promptTemplates.value.push(template);
    }
  }

  function removePromptTemplate(id: string): void {
    promptTemplates.value = promptTemplates.value.filter(t => t.id !== id);
  }

  function getPromptTemplate(id: string): PromptTemplate | undefined {
    return promptTemplates.value.find(t => t.id === id);
  }

  function getTemplatesByModel(modelType: string): PromptTemplate[] {
    return promptTemplates.value.filter(t => t.modelType === modelType);
  }

  // Persistence
  async function loadFromStore(): Promise<void> {
    try {
      const data = await loadSettings();
      theme.value = data.theme as ThemeMode;
      language.value = data.language;
      editorFontSize.value = data.editorFontSize;
      autoSave.value = data.autoSave;
      panelSizes.value = data.panelSizes;
      keyboardShortcuts.value = data.keyboardShortcuts;
      tokenLimits.value = data.tokenLimits;
    } catch (error) {
      console.error('Failed to load settings from store:', error);
    }
  }

  async function persistSettings(): Promise<void> {
    try {
      const data: SettingsData = {
        version: 1,
        theme: theme.value,
        language: language.value,
        editorFontSize: editorFontSize.value,
        autoSave: autoSave.value,
        panelSizes: panelSizes.value,
        keyboardShortcuts: keyboardShortcuts.value,
        tokenLimits: tokenLimits.value,
      };
      await saveSettings(data);
    } catch (error) {
      console.error('Failed to persist settings:', error);
    }
  }

  // Legacy methods for backward compatibility
  function loadFromStorage(data: {
    theme?: ThemeMode;
    language?: string;
    editorFontSize?: number;
    autoSave?: boolean;
    promptTemplates?: PromptTemplate[];
  }): void {
    if (data.theme) theme.value = data.theme;
    if (data.language) language.value = data.language;
    if (data.editorFontSize) editorFontSize.value = data.editorFontSize;
    if (data.autoSave !== undefined) autoSave.value = data.autoSave;
    if (data.promptTemplates) promptTemplates.value = data.promptTemplates;
  }

  function toStorageData(): {
    theme: ThemeMode;
    language: string;
    editorFontSize: number;
    autoSave: boolean;
    promptTemplates: PromptTemplate[];
  } {
    return {
      theme: theme.value,
      language: language.value,
      editorFontSize: editorFontSize.value,
      autoSave: autoSave.value,
      promptTemplates: promptTemplates.value,
    };
  }

  return {
    // State
    theme,
    language,
    editorFontSize,
    autoSave,
    promptTemplates,
    panelSizes,
    keyboardShortcuts,
    tokenLimits,
    // Actions
    setTheme,
    applyTheme,
    setLanguage,
    setEditorFontSize,
    setAutoSave,
    setPanelSizes,
    setKeyboardShortcut,
    setTokenLimit,
    addPromptTemplate,
    removePromptTemplate,
    getPromptTemplate,
    getTemplatesByModel,
    loadFromStore,
    persistSettings,
    loadFromStorage,
    toStorageData,
  };
});
