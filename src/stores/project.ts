import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { Project, FileTreeNode, FileEntry } from '@/types';
import { invoke } from '@tauri-apps/api/core';
import { loadProjects, saveProjects, type ProjectsData } from '@/utils/store';

const MAX_RECENT_PROJECTS = 10;

export const useProjectStore = defineStore('project', () => {
  // State
  const currentProject = ref<Project | null>(null);
  const recentProjects = ref<Project[]>([]);
  const fileTree = ref<FileTreeNode | null>(null);
  const selectedFile = ref<string | null>(null);
  const selectedFileContent = ref<string | null>(null);
  const selectedFiles = ref<Set<string>>(new Set()); // For context injection
  const fileContents = ref<Map<string, string>>(new Map());
  const tokenCount = ref<number>(0);

  // Getters
  const hasProject = computed(() => currentProject.value !== null);
  const projectName = computed(() => currentProject.value?.name ?? '');
  const selectedFilesArray = computed(() => Array.from(selectedFiles.value));
  const selectedFilesCount = computed(() => selectedFiles.value.size);

  // Auto-save recent projects when they change
  watch(
    recentProjects,
    async () => {
      await persistProjects();
    },
    { deep: true }
  );

  // Actions

  /**
   * Validate project path before opening
   */
  async function validateProjectPath(path: string): Promise<{
    valid: boolean;
    error?: string;
    isDirectory?: boolean;
  }> {
    try {
      const result = await invoke<{
        exists: boolean;
        is_directory: boolean;
        is_readable: boolean;
        absolute_path: string;
      }>('validate_path', { path });

      if (!result.exists) {
        return { valid: false, error: 'Path does not exist' };
      }
      if (!result.is_directory) {
        return { valid: false, error: 'Path is not a directory', isDirectory: false };
      }
      if (!result.is_readable) {
        return { valid: false, error: 'Path is not readable' };
      }

      return { valid: true, isDirectory: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  /**
   * Open a project by path
   */
  async function openProject(path: string): Promise<void> {
    try {
      // Validate path first
      const validation = await validateProjectPath(path);
      if (!validation.valid) {
        throw new Error(validation.error || 'Invalid project path');
      }

      // Load gitignore rules if present
      let gitignoreRules: string[] = [];
      try {
        gitignoreRules = await invoke<string[]>('load_gitignore', { 
          projectPath: path 
        });
      } catch (error) {
        console.warn('No .gitignore found or failed to load:', error);
      }

      // Read directory to build file tree (with gitignore filtering)
      const entries = await invoke<FileEntry[]>('read_directory', { 
        path,
        respectGitignore: true
      });
      
      const projectName = path.split(/[/\\]/).pop() || path;
      
      const project: Project = {
        id: generateId(),
        name: projectName,
        path,
        lastOpened: Date.now(),
        aiToolsUsed: [],
        gitignoreRules,
      };

      currentProject.value = project;
      fileTree.value = buildFileTree(path, projectName, entries);
      
      // Clear previous selections
      selectedFiles.value.clear();
      fileContents.value.clear();
      tokenCount.value = 0;
      
      addToRecent(project);
    } catch (error) {
      console.error('Failed to open project:', error);
      throw error;
    }
  }

  function closeProject(): void {
    currentProject.value = null;
    fileTree.value = null;
    selectedFile.value = null;
    selectedFileContent.value = null;
    selectedFiles.value.clear();
    fileContents.value.clear();
    tokenCount.value = 0;
  }

  async function refreshFileTree(): Promise<void> {
    if (!currentProject.value) return;
    
    try {
      const entries = await invoke<FileEntry[]>('read_directory', { 
        path: currentProject.value.path,
        respectGitignore: true
      });
      fileTree.value = buildFileTree(
        currentProject.value.path,
        currentProject.value.name,
        entries
      );
    } catch (error) {
      console.error('Failed to refresh file tree:', error);
      throw error;
    }
  }

  async function selectFile(path: string): Promise<string> {
    try {
      const content = await invoke<string>('read_file', { path });
      selectedFile.value = path;
      selectedFileContent.value = content;
      return content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  }

  /**
   * Toggle file selection for context injection
   */
  async function toggleFileSelection(path: string): Promise<void> {
    if (selectedFiles.value.has(path)) {
      // Deselect
      selectedFiles.value.delete(path);
      fileContents.value.delete(path);
    } else {
      // Select - load file content
      try {
        const content = await invoke<string>('read_file', { path });
        selectedFiles.value.add(path);
        fileContents.value.set(path, content);
      } catch (error) {
        console.error(`Failed to read file ${path}:`, error);
        throw error;
      }
    }
    
    // Recalculate tokens
    await calculateTokens();
  }

  /**
   * Clear all file selections
   */
  function clearSelection(): void {
    selectedFiles.value.clear();
    fileContents.value.clear();
    tokenCount.value = 0;
  }

  /**
   * Calculate total token count for selected files
   */
  async function calculateTokens(): Promise<number> {
    if (selectedFiles.value.size === 0) {
      tokenCount.value = 0;
      return 0;
    }

    try {
      const texts = Array.from(fileContents.value.values());
      const counts = await invoke<number[]>('estimate_tokens_batch', {
        texts,
        modelType: 'gpt-4' // Default model type
      });
      
      const total = counts.reduce((sum, count) => sum + count, 0);
      tokenCount.value = total;
      return total;
    } catch (error) {
      console.error('Failed to calculate tokens:', error);
      return 0;
    }
  }

  /**
   * Get token limit for a model
   */
  async function getTokenLimit(modelType: string = 'gpt-4'): Promise<number> {
    try {
      return await invoke<number>('get_token_limit', { modelType });
    } catch (error) {
      console.error('Failed to get token limit:', error);
      return 8192; // Default fallback
    }
  }

  /**
   * Check if token count exceeds limit
   */
  async function checkTokenLimit(modelType: string = 'gpt-4'): Promise<{
    withinLimit: boolean;
    tokenCount: number;
    tokenLimit: number;
  }> {
    const limit = await getTokenLimit(modelType);
    return {
      withinLimit: tokenCount.value <= limit,
      tokenCount: tokenCount.value,
      tokenLimit: limit,
    };
  }

  function addToRecent(project: Project): void {
    // Remove if already exists
    const filtered = recentProjects.value.filter(p => p.path !== project.path);
    
    // Add to front
    filtered.unshift({
      ...project,
      lastOpened: Date.now(),
    });
    
    // Keep only MAX_RECENT_PROJECTS
    recentProjects.value = filtered.slice(0, MAX_RECENT_PROJECTS);
  }

  function removeFromRecent(projectPath: string): void {
    recentProjects.value = recentProjects.value.filter(p => p.path !== projectPath);
  }

  // Helper functions
  function buildFileTree(
    basePath: string,
    name: string,
    entries: FileEntry[]
  ): FileTreeNode {
    return {
      name,
      path: basePath,
      type: 'directory',
      expanded: true,
      children: entries.map(entry => ({
        name: entry.name,
        path: entry.path,
        type: entry.is_directory ? 'directory' : 'file',
        size: entry.size,
        modified: entry.modified,
        expanded: false,
        children: entry.is_directory ? [] : undefined,
      })),
    };
  }

  function generateId(): string {
    return `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Persistence
  async function loadFromStore(): Promise<void> {
    try {
      const data = await loadProjects();
      recentProjects.value = data.projects;
    } catch (error) {
      console.error('Failed to load projects from store:', error);
    }
  }

  async function persistProjects(): Promise<void> {
    try {
      const data: ProjectsData = {
        version: 1,
        projects: recentProjects.value,
        recentProjects: recentProjects.value.map(p => p.id),
      };
      await saveProjects(data);
    } catch (error) {
      console.error('Failed to persist projects:', error);
    }
  }

  // Legacy methods for backward compatibility
  function loadFromStorage(data: { recentProjects?: Project[] }): void {
    if (data.recentProjects) {
      recentProjects.value = data.recentProjects;
    }
  }

  function toStorageData(): { recentProjects: Project[] } {
    return {
      recentProjects: recentProjects.value,
    };
  }

  return {
    // State
    currentProject,
    recentProjects,
    fileTree,
    selectedFile,
    selectedFileContent,
    selectedFiles,
    fileContents,
    tokenCount,
    // Getters
    hasProject,
    projectName,
    selectedFilesArray,
    selectedFilesCount,
    // Actions
    validateProjectPath,
    openProject,
    closeProject,
    refreshFileTree,
    selectFile,
    toggleFileSelection,
    clearSelection,
    calculateTokens,
    getTokenLimit,
    checkTokenLimit,
    addToRecent,
    removeFromRecent,
    loadFromStore,
    persistProjects,
    loadFromStorage,
    toStorageData,
  };
});
