<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProjectStore } from '@/stores/project';
import type { Project } from '@/types';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'open': [path: string];
}>();

const projectStore = useProjectStore();

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
});

const validationError = ref<string | null>(null);
const isValidating = ref(false);
const isDragging = ref(false);

// Validate path on input
async function validatePath() {
  if (!inputValue.value.trim()) {
    validationError.value = null;
    return;
  }

  isValidating.value = true;
  try {
    const result = await projectStore.validateProjectPath(inputValue.value);
    if (!result.valid) {
      validationError.value = result.error || 'Invalid path';
    } else {
      validationError.value = null;
    }
  } catch (error) {
    validationError.value = String(error);
  } finally {
    isValidating.value = false;
  }
}

// Handle open button click
async function handleOpen() {
  if (!inputValue.value.trim()) {
    validationError.value = 'Please enter a project path';
    return;
  }

  await validatePath();
  if (!validationError.value) {
    emit('open', inputValue.value);
  }
}

// Handle recent project click
function handleRecentClick(project: Project) {
  inputValue.value = project.path;
  emit('open', project.path);
}

// Handle drag and drop
function handleDragEnter(e: DragEvent) {
  e.preventDefault();
  isDragging.value = true;
}

function handleDragLeave(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
}

async function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragging.value = false;

  const items = e.dataTransfer?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry();
      if (entry && entry.isDirectory) {
        // Get the full path - this is a simplified approach
        // In a real Tauri app, you'd use the file system API
        inputValue.value = entry.fullPath;
        await validatePath();
        if (!validationError.value) {
          emit('open', entry.fullPath);
        }
        break;
      }
    }
  }
}

// Handle browse button (would open native file dialog in Tauri)
async function handleBrowse() {
  try {
    // In a real Tauri app, use the dialog API
    // const selected = await open({ directory: true });
    // if (selected) {
    //   inputValue.value = selected as string;
    //   emit('open', selected as string);
    // }
    console.log('Browse dialog would open here');
  } catch (error) {
    console.error('Failed to open browse dialog:', error);
  }
}
</script>

<template>
  <div class="project-path-input">
    <!-- Input Section -->
    <div
      class="input-container"
      :class="{ 'dragging': isDragging, 'error': validationError }"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <div class="input-wrapper">
        <input
          v-model="inputValue"
          type="text"
          :placeholder="placeholder || 'Enter project path or drag & drop folder'"
          class="path-input"
          @blur="validatePath"
          @keyup.enter="handleOpen"
        />
        <div class="input-actions">
          <button
            class="btn-browse"
            @click="handleBrowse"
            title="Browse for folder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"/>
            </svg>
          </button>
          <button
            class="btn-open"
            :disabled="isValidating || !!validationError || !inputValue.trim()"
            @click="handleOpen"
          >
            Open
          </button>
        </div>
      </div>
      
      <!-- Validation Error -->
      <div v-if="validationError" class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ validationError }}</span>
      </div>

      <!-- Drag & Drop Hint -->
      <div v-if="isDragging" class="drag-hint">
        Drop folder here to open
      </div>
    </div>

    <!-- Recent Projects -->
    <div v-if="projectStore.recentProjects.length > 0" class="recent-projects">
      <h3 class="recent-title">Recent Projects</h3>
      <div class="recent-list">
        <button
          v-for="project in projectStore.recentProjects"
          :key="project.id"
          class="recent-item"
          @click="handleRecentClick(project)"
        >
          <div class="recent-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"/>
            </svg>
          </div>
          <div class="recent-info">
            <div class="recent-name">{{ project.name }}</div>
            <div class="recent-path">{{ project.path }}</div>
          </div>
          <div class="recent-time">
            {{ new Date(project.lastOpened).toLocaleDateString() }}
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-path-input {
  width: 100%;
}

.input-container {
  position: relative;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: white;
  transition: all 0.2s;
}

.input-container.dragging {
  border-color: #3b82f6;
  background: #eff6ff;
}

.input-container.error {
  border-color: #ef4444;
}

.dark .input-container {
  background: #1f2937;
  border-color: #374151;
}

.dark .input-container.dragging {
  background: #1e3a5f;
  border-color: #3b82f6;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.path-input:focus {
  border-color: #3b82f6;
}

.dark .path-input {
  background: #111827;
  border-color: #4b5563;
  color: #f9fafb;
}

.input-actions {
  display: flex;
  gap: 8px;
}

.btn-browse {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-browse:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.dark .btn-browse {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.dark .btn-browse:hover {
  background: #4b5563;
}

.btn-open {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-open:hover:not(:disabled) {
  background: #2563eb;
}

.btn-open:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: #ef4444;
  font-size: 13px;
}

.drag-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-weight: 500;
  color: #3b82f6;
  pointer-events: none;
}

.recent-projects {
  margin-top: 24px;
}

.recent-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.dark .recent-title {
  color: #d1d5db;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.recent-item:hover {
  background: #f9fafb;
  border-color: #3b82f6;
}

.dark .recent-item {
  background: #1f2937;
  border-color: #374151;
}

.dark .recent-item:hover {
  background: #374151;
  border-color: #3b82f6;
}

.recent-icon {
  flex-shrink: 0;
  color: #6b7280;
}

.dark .recent-icon {
  color: #9ca3af;
}

.recent-info {
  flex: 1;
  min-width: 0;
}

.recent-name {
  font-weight: 500;
  color: #111827;
  margin-bottom: 2px;
}

.dark .recent-name {
  color: #f9fafb;
}

.recent-path {
  font-size: 12px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .recent-path {
  color: #9ca3af;
}

.recent-time {
  flex-shrink: 0;
  font-size: 12px;
  color: #9ca3af;
}

.dark .recent-time {
  color: #6b7280;
}
</style>
