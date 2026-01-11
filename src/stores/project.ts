import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Project, FileTreeNode, FileEntry } from '@/types';
import { invoke } from '@tauri-apps/api/core';

const MAX_RECENT_PROJECTS = 10;

export const useProjectStore = defineStore('project', () => {
  // State
  const currentProject = ref<Project | null>(null);
  const recentProjects = ref<Project[]>([]);
  const fileTree = ref<FileTreeNode | null>(null);
  const selectedFile = ref<string | null>(null);
  const selectedFileContent = ref<string | null>(null);

  // Getters
  const hasProject = computed(() => currentProject.value !== null);
  const projectName = computed(() => currentProject.value?.name ?? '');

  // Actions
  async function openProject(path: string): Promise<void> {
    try {
      // Read directory to build file tree
      const entries = await invoke<FileEntry[]>('read_directory', { path });
      
      const projectName = path.split(/[/\\]/).pop() || path;
      
      const project: Project = {
        id: generateId(),
        name: projectName,
        path,
        lastOpened: Date.now(),
        aiToolsUsed: [],
      };

      currentProject.value = project;
      fileTree.value = buildFileTree(path, projectName, entries);
      
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
  }

  async function refreshFileTree(): Promise<void> {
    if (!currentProject.value) return;
    
    try {
      const entries = await invoke<FileEntry[]>('read_directory', { 
        path: currentProject.value.path 
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

  // Load/Save for persistence
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
    // Getters
    hasProject,
    projectName,
    // Actions
    openProject,
    closeProject,
    refreshFileTree,
    selectFile,
    addToRecent,
    removeFromRecent,
    loadFromStorage,
    toStorageData,
  };
});
