<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useProjectStore } from '@/stores/project';
import ProjectPathInput from '@/components/ProjectPathInput.vue';
import FileTree from '@/components/FileTree.vue';
import ContextPanel from '@/components/ContextPanel.vue';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; // You can change this to any theme

const projectStore = useProjectStore();

const projectPath = ref('');
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const codeElement = ref<HTMLElement | null>(null);

// Handle project open
async function handleOpenProject(path: string) {
  isLoading.value = true;
  errorMessage.value = null;
  
  try {
    await projectStore.openProject(path);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    isLoading.value = false;
  }
}

// Apply syntax highlighting when file content changes
watch(() => projectStore.selectedFileContent, async () => {
  if (projectStore.selectedFileContent && projectStore.selectedFile) {
    await nextTick();
    if (codeElement.value) {
      hljs.highlightElement(codeElement.value);
    }
  }
});

// Detect language from file extension for syntax highlighting
function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'js': 'javascript',
    'vue': 'vue',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'rs': 'rust',
    'py': 'python',
    'go': 'go',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'sh': 'bash',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'xml': 'xml',
    'sql': 'sql',
  };
  
  return languageMap[ext || ''] || 'plaintext';
}

// Get file name from path
function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

// Format file size
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Get file stats if available
const selectedFileStats = computed(() => {
  if (!projectStore.selectedFile || !projectStore.fileTree) return null;
  
  // Find the file in the tree to get its stats
  function findFile(node: any, path: string): any {
    if (node.path === path) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findFile(child, path);
        if (found) return found;
      }
    }
    return null;
  }
  
  return findFile(projectStore.fileTree, projectStore.selectedFile);
});
</script>

<template>
  <div class="project-view">
    <!-- No Project State -->
    <div v-if="!projectStore.currentProject" class="no-project-state">
      <div class="no-project-content">
        <div class="no-project-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"/>
          </svg>
        </div>
        <h2 class="no-project-title">Open a Project</h2>
        <p class="no-project-description">
          Select a project directory to start working with AI tools
        </p>
        
        <div class="project-input-container">
          <ProjectPathInput
            v-model="projectPath"
            @open="handleOpenProject"
          />
        </div>

        <div v-if="errorMessage" class="error-banner">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="isLoading" class="loading-indicator">
          <div class="spinner"></div>
          <span>Opening project...</span>
        </div>
      </div>
    </div>

    <!-- Project Opened State -->
    <div v-else class="project-layout">
      <!-- Left Sidebar: File Tree -->
      <aside class="file-tree-sidebar">
        <div class="sidebar-header">
          <div class="project-info">
            <h2 class="project-name">{{ projectStore.currentProject.name }}</h2>
            <p class="project-path">{{ projectStore.currentProject.path }}</p>
          </div>
          <button
            class="btn-close-project"
            @click="projectStore.closeProject()"
            title="Close project"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="sidebar-content">
          <FileTree />
        </div>
      </aside>

      <!-- Main Content: File Preview -->
      <main class="file-preview-main">
        <div v-if="!projectStore.selectedFile" class="preview-empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>Select a file to preview</p>
          <p class="preview-hint">Click on any file in the tree to view its contents</p>
        </div>

        <div v-else class="preview-container">
          <!-- File Header -->
          <div class="preview-header">
            <div class="file-header-info">
              <h3 class="file-header-name">{{ getFileName(projectStore.selectedFile) }}</h3>
              <div class="file-header-meta">
                <span class="file-language">
                  {{ detectLanguage(projectStore.selectedFile) }}
                </span>
                <span v-if="selectedFileStats?.size" class="file-size">
                  {{ formatSize(selectedFileStats.size) }}
                </span>
              </div>
            </div>
          </div>

          <!-- File Content -->
          <div class="preview-content">
            <pre class="code-block"><code 
              ref="codeElement"
              :class="`language-${detectLanguage(projectStore.selectedFile)}`"
            >{{ projectStore.selectedFileContent }}</code></pre>
          </div>
        </div>
      </main>

      <!-- Right Sidebar: Context Panel -->
      <aside class="context-sidebar">
        <ContextPanel />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.project-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.dark .project-view {
  background: #111827;
}

/* No Project State */
.no-project-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.no-project-content {
  max-width: 600px;
  width: 100%;
  text-align: center;
}

.no-project-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  color: #9ca3af;
}

.dark .no-project-icon {
  color: #6b7280;
}

.no-project-title {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.dark .no-project-title {
  color: #f9fafb;
}

.no-project-description {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 32px 0;
}

.dark .no-project-description {
  color: #9ca3af;
}

.project-input-container {
  margin-bottom: 24px;
}

.error-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 16px;
}

.dark .error-banner {
  background: #7f1d1d;
  color: #fee2e2;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6b7280;
  font-size: 14px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Project Layout */
.project-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* File Tree Sidebar */
.file-tree-sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: white;
  border-right: 1px solid #e5e7eb;
}

.dark .file-tree-sidebar {
  background: #1f2937;
  border-right-color: #374151;
}

.sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .sidebar-header {
  border-bottom-color: #374151;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .project-name {
  color: #f9fafb;
}

.project-path {
  font-size: 11px;
  color: #6b7280;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .project-path {
  color: #9ca3af;
}

.btn-close-project {
  flex-shrink: 0;
  padding: 4px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close-project:hover {
  background: #f3f4f6;
  color: #ef4444;
}

.dark .btn-close-project:hover {
  background: #374151;
  color: #f87171;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

/* Main Content */
.file-preview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

.dark .file-preview-main {
  background: #1f2937;
}

.preview-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  padding: 48px;
}

.preview-empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.preview-empty-state p {
  margin: 0;
}

.preview-hint {
  font-size: 12px;
  margin-top: 8px;
  color: #9ca3af;
}

.dark .preview-empty-state {
  color: #9ca3af;
}

.dark .preview-hint {
  color: #6b7280;
}

.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.dark .preview-header {
  background: #111827;
  border-bottom-color: #374151;
}

.file-header-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-header-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.dark .file-header-name {
  color: #f9fafb;
}

.file-header-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.dark .file-header-meta {
  color: #9ca3af;
}

.file-language {
  text-transform: uppercase;
  font-weight: 500;
}

.preview-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.code-block {
  margin: 0;
  padding: 0;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

.code-block code {
  display: block;
  padding: 16px;
  color: #c9d1d9;
  background: transparent;
}

.dark .code-block {
  background: #0d1117;
  border-color: #30363d;
}

/* Light theme override for code blocks */
:not(.dark) .code-block {
  background: #f6f8fa;
  border-color: #d0d7de;
}

:not(.dark) .code-block code {
  color: #24292f;
}

/* Context Sidebar */
.context-sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Scrollbar styling */
.preview-content::-webkit-scrollbar,
.code-block::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.preview-content::-webkit-scrollbar-track,
.code-block::-webkit-scrollbar-track {
  background: transparent;
}

.preview-content::-webkit-scrollbar-thumb,
.code-block::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.preview-content::-webkit-scrollbar-thumb:hover,
.code-block::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .preview-content::-webkit-scrollbar-thumb,
.dark .code-block::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .preview-content::-webkit-scrollbar-thumb:hover,
.dark .code-block::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
