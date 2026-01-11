import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { PromptTemplate, ThemeMode } from '@/types';

export const useSettingsStore = defineStore('settings', () => {
  // State
  const theme = ref<ThemeMode>('system');
  const language = ref<string>('zh-CN');
  const editorFontSize = ref<number>(14);
  const autoSave = ref<boolean>(true);
  const promptTemplates = ref<PromptTemplate[]>([]);

  // Watch theme changes and apply to document
  watch(theme, (newTheme) => {
    applyTheme(newTheme);
  }, { immediate: true });

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
    // Actions
    setTheme,
    applyTheme,
    setLanguage,
    setEditorFontSize,
    setAutoSave,
    addPromptTemplate,
    removePromptTemplate,
    getPromptTemplate,
    getTemplatesByModel,
    loadFromStorage,
    toStorageData,
  };
});
