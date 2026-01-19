<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();

// Token limit for the current model (default to GPT-4)
const currentModel = ref('gpt-4');
const tokenLimit = ref(8192);
const isLoadingLimit = ref(false);

// Load token limit on mount and when model changes
watch(currentModel, async (newModel) => {
  isLoadingLimit.value = true;
  try {
    tokenLimit.value = await projectStore.getTokenLimit(newModel);
  } catch (error) {
    console.error('Failed to get token limit:', error);
    tokenLimit.value = 8192; // Fallback
  } finally {
    isLoadingLimit.value = false;
  }
}, { immediate: true });

// Computed properties
const selectedFilesArray = computed(() => Array.from(projectStore.selectedFiles));
const tokenPercentage = computed(() => {
  if (tokenLimit.value === 0) return 0;
  return Math.min((projectStore.tokenCount / tokenLimit.value) * 100, 100);
});

const isNearLimit = computed(() => tokenPercentage.value > 70);
const isOverLimit = computed(() => tokenPercentage.value >= 100);

const statusColor = computed(() => {
  if (isOverLimit.value) return 'text-red-600 dark:text-red-400';
  if (isNearLimit.value) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
});

const progressBarColor = computed(() => {
  if (isOverLimit.value) return 'bg-red-500';
  if (isNearLimit.value) return 'bg-yellow-500';
  return 'bg-green-500';
});

// Format file path to show only filename
function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || path;
}

// Get relative path from project root
function getRelativePath(path: string): string {
  if (!projectStore.currentProject) return path;
  const projectPath = projectStore.currentProject.path;
  if (path.startsWith(projectPath)) {
    return path.substring(projectPath.length + 1);
  }
  return path;
}

// Remove a file from selection
async function removeFile(path: string) {
  try {
    await projectStore.toggleFileSelection(path);
  } catch (error) {
    console.error('Failed to remove file:', error);
  }
}

// Clear all selections
function clearAll() {
  projectStore.clearSelection();
}

// Format token count with commas
function formatTokenCount(count: number): string {
  return count.toLocaleString();
}
</script>

<template>
  <div class="context-panel">
    <!-- Header -->
    <div class="panel-header">
      <h3 class="panel-title">Context Selection</h3>
      <button
        v-if="selectedFilesArray.length > 0"
        class="btn-clear"
        @click="clearAll"
        title="Clear all selections"
      >
        Clear All
      </button>
    </div>

    <!-- Token Counter -->
    <div class="token-counter">
      <div class="token-info">
        <div class="token-label">Token Usage</div>
        <div class="token-count" :class="statusColor">
          {{ formatTokenCount(projectStore.tokenCount) }} / {{ formatTokenCount(tokenLimit) }}
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div class="progress-bar-container">
        <div 
          class="progress-bar"
          :class="progressBarColor"
          :style="{ width: tokenPercentage + '%' }"
        ></div>
      </div>

      <!-- Warning Messages -->
      <div v-if="isOverLimit" class="warning-message error">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Token limit exceeded! Please reduce selection.</span>
      </div>
      <div v-else-if="isNearLimit" class="warning-message warning">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>Approaching token limit ({{ tokenPercentage.toFixed(0) }}%)</span>
      </div>
    </div>

    <!-- Selected Files List -->
    <div class="selected-files">
      <div v-if="selectedFilesArray.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>No files selected</p>
        <p class="empty-hint">Select files from the tree to include them in the AI context</p>
      </div>

      <div v-else class="files-list">
        <div
          v-for="filePath in selectedFilesArray"
          :key="filePath"
          class="file-item"
        >
          <div class="file-icon">📄</div>
          <div class="file-info">
            <div class="file-name">{{ getFileName(filePath) }}</div>
            <div class="file-path">{{ getRelativePath(filePath) }}</div>
          </div>
          <button
            class="btn-remove"
            @click="removeFile(filePath)"
            title="Remove from context"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Model Selector -->
    <div class="model-selector">
      <label for="model-select" class="model-label">Target Model</label>
      <select
        id="model-select"
        v-model="currentModel"
        class="model-select"
      >
        <option value="gpt-4">GPT-4 (8K)</option>
        <option value="gpt-4-32k">GPT-4 (32K)</option>
        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (4K)</option>
        <option value="gpt-3.5-turbo-16k">GPT-3.5 Turbo (16K)</option>
        <option value="claude-2">Claude 2 (100K)</option>
        <option value="llama-2">Llama 2 (4K)</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.context-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border-left: 1px solid #e5e7eb;
}

.dark .context-panel {
  background: #1f2937;
  border-left-color: #374151;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .panel-header {
  border-bottom-color: #374151;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.dark .panel-title {
  color: #f9fafb;
}

.btn-clear {
  padding: 4px 12px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #f3f4f6;
  color: #111827;
  border-color: #9ca3af;
}

.dark .btn-clear {
  background: #374151;
  border-color: #4b5563;
  color: #d1d5db;
}

.dark .btn-clear:hover {
  background: #4b5563;
  color: #f9fafb;
}

.token-counter {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .token-counter {
  border-bottom-color: #374151;
}

.token-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.token-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.dark .token-label {
  color: #9ca3af;
}

.token-count {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.progress-bar-container {
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}

.dark .progress-bar-container {
  background: #374151;
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
  border-radius: 3px;
}

.warning-message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.warning-message.warning {
  background: #fef3c7;
  color: #92400e;
}

.warning-message.error {
  background: #fee2e2;
  color: #991b1b;
}

.dark .warning-message.warning {
  background: #78350f;
  color: #fef3c7;
}

.dark .warning-message.error {
  background: #7f1d1d;
  color: #fee2e2;
}

.selected-files {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #6b7280;
  padding: 24px;
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
}

.empty-hint {
  font-size: 12px;
  margin-top: 8px;
  color: #9ca3af;
}

.dark .empty-state {
  color: #9ca3af;
}

.dark .empty-hint {
  color: #6b7280;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  transition: all 0.2s;
}

.file-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.dark .file-item {
  background: #111827;
  border-color: #374151;
}

.dark .file-item:hover {
  background: #1f2937;
  border-color: #4b5563;
}

.file-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .file-name {
  color: #f9fafb;
}

.file-path {
  font-size: 11px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.dark .file-path {
  color: #9ca3af;
}

.btn-remove {
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

.btn-remove:hover {
  background: #e5e7eb;
  color: #ef4444;
}

.dark .btn-remove:hover {
  background: #374151;
  color: #f87171;
}

.model-selector {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.dark .model-selector {
  border-top-color: #374151;
}

.model-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 8px;
}

.dark .model-label {
  color: #9ca3af;
}

.model-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #111827;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}

.model-select:focus {
  border-color: #3b82f6;
}

.dark .model-select {
  background: #111827;
  border-color: #4b5563;
  color: #f9fafb;
}

/* Scrollbar styling */
.selected-files::-webkit-scrollbar {
  width: 8px;
}

.selected-files::-webkit-scrollbar-track {
  background: transparent;
}

.selected-files::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.selected-files::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .selected-files::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .selected-files::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
