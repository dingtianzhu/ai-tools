<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  mode?: 'side-by-side' | 'unified';
  changeType?: 'create' | 'modify' | 'delete';
}

interface Emits {
  (e: 'approve'): void;
  (e: 'reject'): void;
  (e: 'edit', content: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'side-by-side',
  changeType: 'modify'
});

const emit = defineEmits<Emits>();

// Local state for editing
const isEditing = ref(false);
const editedContent = ref(props.modifiedContent);

// Compute diff lines
interface DiffLine {
  type: 'add' | 'remove' | 'unchanged' | 'empty';
  content: string;
  lineNumber?: number;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
}

const diffLines = computed(() => {
  const original = props.originalContent.split('\n');
  const modified = props.modifiedContent.split('\n');
  const lines: DiffLine[] = [];

  // Simple line-by-line diff algorithm
  // This is a basic implementation - a production version would use a proper diff algorithm
  const maxLength = Math.max(original.length, modified.length);
  
  for (let i = 0; i < maxLength; i++) {
    const origLine = original[i];
    const modLine = modified[i];

    if (origLine === modLine) {
      // Unchanged line
      lines.push({
        type: 'unchanged',
        content: origLine || '',
        originalLineNumber: i + 1,
        modifiedLineNumber: i + 1
      });
    } else if (origLine !== undefined && modLine !== undefined) {
      // Modified line - show as remove + add
      lines.push({
        type: 'remove',
        content: origLine,
        originalLineNumber: i + 1
      });
      lines.push({
        type: 'add',
        content: modLine,
        modifiedLineNumber: i + 1
      });
    } else if (origLine !== undefined) {
      // Removed line
      lines.push({
        type: 'remove',
        content: origLine,
        originalLineNumber: i + 1
      });
    } else if (modLine !== undefined) {
      // Added line
      lines.push({
        type: 'add',
        content: modLine,
        modifiedLineNumber: i + 1
      });
    }
  }

  return lines;
});

// Side-by-side diff computation
const sideBySideDiff = computed(() => {
  const original = props.originalContent.split('\n');
  const modified = props.modifiedContent.split('\n');
  const maxLength = Math.max(original.length, modified.length);
  
  const leftLines: DiffLine[] = [];
  const rightLines: DiffLine[] = [];

  for (let i = 0; i < maxLength; i++) {
    const origLine = original[i];
    const modLine = modified[i];

    if (origLine === modLine) {
      // Unchanged
      leftLines.push({
        type: 'unchanged',
        content: origLine || '',
        lineNumber: i + 1
      });
      rightLines.push({
        type: 'unchanged',
        content: modLine || '',
        lineNumber: i + 1
      });
    } else {
      // Changed or missing
      if (origLine !== undefined) {
        leftLines.push({
          type: origLine !== modLine && modLine !== undefined ? 'remove' : 'remove',
          content: origLine,
          lineNumber: i + 1
        });
      } else {
        leftLines.push({
          type: 'empty',
          content: '',
          lineNumber: undefined
        });
      }

      if (modLine !== undefined) {
        rightLines.push({
          type: origLine !== modLine && origLine !== undefined ? 'add' : 'add',
          content: modLine,
          lineNumber: i + 1
        });
      } else {
        rightLines.push({
          type: 'empty',
          content: '',
          lineNumber: undefined
        });
      }
    }
  }

  return { leftLines, rightLines };
});

// Change type badge color
const changeTypeBadgeClass = computed(() => {
  switch (props.changeType) {
    case 'create':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'delete':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'modify':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
});

// Action handlers
function handleApprove() {
  if (isEditing.value) {
    emit('edit', editedContent.value);
    isEditing.value = false;
  } else {
    emit('approve');
  }
}

function handleReject() {
  if (isEditing.value) {
    // Cancel editing
    isEditing.value = false;
    editedContent.value = props.modifiedContent;
  } else {
    emit('reject');
  }
}

function handleEdit() {
  isEditing.value = true;
  editedContent.value = props.modifiedContent;
}

// Get line class based on type
function getLineClass(type: DiffLine['type']): string {
  switch (type) {
    case 'add':
      return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500';
    case 'remove':
      return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
    case 'unchanged':
      return 'bg-white dark:bg-gray-800';
    case 'empty':
      return 'bg-gray-50 dark:bg-gray-900';
    default:
      return '';
  }
}

// Get line prefix
function getLinePrefix(type: DiffLine['type']): string {
  switch (type) {
    case 'add':
      return '+';
    case 'remove':
      return '-';
    case 'unchanged':
      return ' ';
    default:
      return '';
  }
}
</script>

<template>
  <div class="diff-view">
    <!-- Header -->
    <div class="diff-header">
      <div class="flex items-center gap-3">
        <span class="file-path">{{ filePath }}</span>
        <span 
          class="change-type-badge"
          :class="changeTypeBadgeClass"
        >
          {{ changeType }}
        </span>
      </div>
      
      <!-- Actions -->
      <div class="diff-actions">
        <button
          v-if="!isEditing"
          @click="handleEdit"
          class="action-btn edit-btn"
          title="Edit changes"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
        
        <button
          @click="handleReject"
          class="action-btn reject-btn"
          :title="isEditing ? 'Cancel editing' : 'Reject changes'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          {{ isEditing ? 'Cancel' : 'Reject' }}
        </button>
        
        <button
          @click="handleApprove"
          class="action-btn approve-btn"
          :title="isEditing ? 'Save changes' : 'Approve changes'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ isEditing ? 'Save' : 'Approve' }}
        </button>
      </div>
    </div>

    <!-- Edit Mode -->
    <div v-if="isEditing" class="edit-mode">
      <textarea
        v-model="editedContent"
        class="edit-textarea"
        rows="20"
        placeholder="Edit the modified content..."
      />
    </div>

    <!-- Diff Display -->
    <div v-else class="diff-content">
      <!-- Side-by-side view -->
      <div v-if="mode === 'side-by-side'" class="side-by-side-view">
        <!-- Original (left) -->
        <div class="diff-pane">
          <div class="pane-header">Original</div>
          <div class="code-lines">
            <div
              v-for="(line, index) in sideBySideDiff.leftLines"
              :key="`left-${index}`"
              class="code-line"
              :class="getLineClass(line.type)"
            >
              <span class="line-number">{{ line.lineNumber || '' }}</span>
              <span class="line-prefix">{{ getLinePrefix(line.type) }}</span>
              <span class="line-content">{{ line.content || '\u00A0' }}</span>
            </div>
          </div>
        </div>

        <!-- Modified (right) -->
        <div class="diff-pane">
          <div class="pane-header">Modified</div>
          <div class="code-lines">
            <div
              v-for="(line, index) in sideBySideDiff.rightLines"
              :key="`right-${index}`"
              class="code-line"
              :class="getLineClass(line.type)"
            >
              <span class="line-number">{{ line.lineNumber || '' }}</span>
              <span class="line-prefix">{{ getLinePrefix(line.type) }}</span>
              <span class="line-content">{{ line.content || '\u00A0' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Unified view -->
      <div v-else class="unified-view">
        <div class="code-lines">
          <div
            v-for="(line, index) in diffLines"
            :key="`unified-${index}`"
            class="code-line"
            :class="getLineClass(line.type)"
          >
            <span class="line-number original">{{ line.originalLineNumber || '' }}</span>
            <span class="line-number modified">{{ line.modifiedLineNumber || '' }}</span>
            <span class="line-prefix">{{ getLinePrefix(line.type) }}</span>
            <span class="line-content">{{ line.content || '\u00A0' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-view {
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.dark .diff-view {
  border-color: #374151;
  background: #1f2937;
}

/* Header */
.diff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.dark .diff-header {
  background: #111827;
  border-bottom-color: #374151;
}

.file-path {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.dark .file-path {
  color: #f9fafb;
}

.change-type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

/* Actions */
.diff-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.dark .action-btn {
  border-color: #4b5563;
  background: #374151;
  color: #f9fafb;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.dark .action-btn:hover {
  background: #4b5563;
  border-color: #6b7280;
}

.edit-btn:hover {
  background: #dbeafe;
  border-color: #3b82f6;
  color: #1e40af;
}

.dark .edit-btn:hover {
  background: #1e3a8a;
  border-color: #3b82f6;
  color: #93c5fd;
}

.reject-btn:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
}

.dark .reject-btn:hover {
  background: #7f1d1d;
  border-color: #ef4444;
  color: #fca5a5;
}

.approve-btn {
  background: #10b981;
  border-color: #10b981;
  color: white;
}

.approve-btn:hover {
  background: #059669;
  border-color: #059669;
}

.dark .approve-btn {
  background: #059669;
  border-color: #059669;
}

.dark .approve-btn:hover {
  background: #047857;
  border-color: #047857;
}

/* Edit Mode */
.edit-mode {
  padding: 16px;
}

.edit-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #111827;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
}

.dark .edit-textarea {
  border-color: #4b5563;
  background: #374151;
  color: #f9fafb;
}

.edit-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Diff Content */
.diff-content {
  overflow: auto;
  max-height: 600px;
}

/* Side-by-side view */
.side-by-side-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: #e5e7eb;
}

.dark .side-by-side-view {
  background: #374151;
}

.diff-pane {
  display: flex;
  flex-direction: column;
  background: white;
}

.dark .diff-pane {
  background: #1f2937;
}

.pane-header {
  padding: 8px 12px;
  background: #f3f4f6;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
}

.dark .pane-header {
  background: #111827;
  border-bottom-color: #374151;
  color: #9ca3af;
}

/* Code lines */
.code-lines {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.code-line {
  display: flex;
  align-items: center;
  min-height: 20px;
  padding: 2px 0;
}

.line-number {
  flex-shrink: 0;
  width: 50px;
  padding: 0 8px;
  text-align: right;
  color: #9ca3af;
  user-select: none;
}

.dark .line-number {
  color: #6b7280;
}

.unified-view .line-number.original {
  width: 40px;
}

.unified-view .line-number.modified {
  width: 40px;
  border-right: 1px solid #e5e7eb;
  margin-right: 8px;
}

.dark .unified-view .line-number.modified {
  border-right-color: #374151;
}

.line-prefix {
  flex-shrink: 0;
  width: 20px;
  text-align: center;
  font-weight: 600;
  user-select: none;
}

.line-content {
  flex: 1;
  padding: 0 12px;
  white-space: pre;
  overflow-x: auto;
}

/* Line type colors */
.code-line.bg-green-50 .line-prefix {
  color: #059669;
}

.dark .code-line.bg-green-50 .line-prefix {
  color: #10b981;
}

.code-line.bg-red-50 .line-prefix {
  color: #dc2626;
}

.dark .code-line.bg-red-50 .line-prefix {
  color: #ef4444;
}

/* Scrollbar */
.diff-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.diff-content::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.dark .diff-content::-webkit-scrollbar-track {
  background: #1f2937;
}

.diff-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.dark .diff-content::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.diff-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .diff-content::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
