<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProjectStore } from '@/stores/project';
import type { FileTreeNode } from '@/types';

const projectStore = useProjectStore();

// Track expanded nodes
const expandedNodes = ref<Set<string>>(new Set());

// File/folder icons
const getIcon = (node: FileTreeNode) => {
  if (node.type === 'directory') {
    return expandedNodes.value.has(node.path) ? '📂' : '📁';
  }
  
  // Simple file type detection based on extension
  const ext = node.name.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    'ts': '📘',
    'js': '📙',
    'vue': '💚',
    'json': '📋',
    'md': '📝',
    'css': '🎨',
    'html': '🌐',
    'rs': '🦀',
    'py': '🐍',
    'go': '🔵',
    'java': '☕',
  };
  
  return iconMap[ext || ''] || '📄';
};

// Toggle node expansion
function toggleExpand(node: FileTreeNode) {
  if (node.type !== 'directory') return;
  
  if (expandedNodes.value.has(node.path)) {
    expandedNodes.value.delete(node.path);
  } else {
    expandedNodes.value.add(node.path);
  }
}

// Handle file selection for context injection
async function handleFileSelect(node: FileTreeNode, event: Event) {
  if (node.type === 'directory') return;
  
  event.stopPropagation();
  
  try {
    await projectStore.toggleFileSelection(node.path);
  } catch (error) {
    console.error('Failed to toggle file selection:', error);
  }
}

// Handle file click for preview
async function handleFileClick(node: FileTreeNode) {
  if (node.type === 'directory') {
    toggleExpand(node);
  } else {
    try {
      await projectStore.selectFile(node.path);
    } catch (error) {
      console.error('Failed to select file:', error);
    }
  }
}

// Check if file is selected
function isSelected(path: string): boolean {
  return projectStore.selectedFiles.has(path);
}

// Format file size
function formatSize(bytes?: number): string {
  if (!bytes) return '';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Recursive tree node component
const TreeNode = {
  name: 'TreeNode',
  props: {
    node: {
      type: Object as () => FileTreeNode,
      required: true,
    },
    depth: {
      type: Number,
      default: 0,
    },
  },
  setup(props: { node: FileTreeNode; depth: number }) {
    const isExpanded = computed(() => expandedNodes.value.has(props.node.path));
    const hasChildren = computed(() => 
      props.node.type === 'directory' && 
      props.node.children && 
      props.node.children.length > 0
    );

    return {
      isExpanded,
      hasChildren,
      getIcon,
      toggleExpand,
      handleFileSelect,
      handleFileClick,
      isSelected,
      formatSize,
    };
  },
  template: `
    <div class="tree-node">
      <div 
        class="node-content"
        :class="{ 
          'is-directory': node.type === 'directory',
          'is-selected': isSelected(node.path),
          'is-active': node.path === projectStore.selectedFile
        }"
        :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
        @click="handleFileClick(node)"
      >
        <!-- Expand/Collapse Arrow -->
        <span 
          v-if="node.type === 'directory'" 
          class="expand-arrow"
          :class="{ 'expanded': isExpanded }"
        >
          ▶
        </span>
        <span v-else class="expand-arrow-placeholder"></span>

        <!-- Checkbox for context injection -->
        <input
          v-if="node.type === 'file'"
          type="checkbox"
          class="file-checkbox"
          :checked="isSelected(node.path)"
          @click.stop="handleFileSelect(node, $event)"
        />
        <span v-else class="checkbox-placeholder"></span>

        <!-- Icon -->
        <span class="node-icon">{{ getIcon(node) }}</span>

        <!-- Name -->
        <span class="node-name">{{ node.name }}</span>

        <!-- File size -->
        <span v-if="node.type === 'file' && node.size" class="node-size">
          {{ formatSize(node.size) }}
        </span>
      </div>

      <!-- Children -->
      <div v-if="isExpanded && hasChildren" class="node-children">
        <TreeNode
          v-for="child in node.children"
          :key="child.path"
          :node="child"
          :depth="depth + 1"
        />
      </div>
    </div>
  `,
};
</script>

<template>
  <div class="file-tree">
    <div v-if="!projectStore.fileTree" class="empty-state">
      <p>No project opened</p>
      <p class="empty-hint">Open a project to view its file structure</p>
    </div>

    <div v-else class="tree-container">
      <!-- Root node -->
      <component
        :is="TreeNode"
        :node="projectStore.fileTree"
        :depth="0"
      />
    </div>
  </div>
</template>

<style scoped>
.file-tree {
  height: 100%;
  overflow-y: auto;
  font-size: 14px;
}

.empty-state {
  padding: 24px;
  text-align: center;
  color: #6b7280;
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

.tree-container {
  padding: 8px 0;
}

.tree-node {
  user-select: none;
}

.node-content {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
  min-height: 28px;
}

.node-content:hover {
  background: #f3f4f6;
}

.node-content.is-selected {
  background: #dbeafe;
}

.node-content.is-active {
  background: #bfdbfe;
  font-weight: 500;
}

.dark .node-content:hover {
  background: #374151;
}

.dark .node-content.is-selected {
  background: #1e3a5f;
}

.dark .node-content.is-active {
  background: #1e40af;
}

.expand-arrow {
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #6b7280;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.expand-arrow.expanded {
  transform: rotate(90deg);
}

.expand-arrow-placeholder {
  width: 12px;
  flex-shrink: 0;
}

.file-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.checkbox-placeholder {
  width: 14px;
  flex-shrink: 0;
}

.node-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #111827;
}

.dark .node-name {
  color: #f9fafb;
}

.node-size {
  font-size: 11px;
  color: #9ca3af;
  flex-shrink: 0;
}

.dark .node-size {
  color: #6b7280;
}

.node-children {
  /* Children are indented via paddingLeft in the template */
}

/* Scrollbar styling */
.file-tree::-webkit-scrollbar {
  width: 8px;
}

.file-tree::-webkit-scrollbar-track {
  background: transparent;
}

.file-tree::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.file-tree::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .file-tree::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .file-tree::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
