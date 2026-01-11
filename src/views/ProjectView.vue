<script setup lang="ts">
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();
</script>

<template>
  <div class="flex h-screen">
    <!-- Sidebar: File Tree -->
    <aside class="w-64 border-r border-gray-200 dark:border-gray-700 p-4">
      <h2 class="text-lg font-semibold mb-4">项目文件</h2>
      <div v-if="projectStore.currentProject">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ projectStore.currentProject.name }}
        </p>
      </div>
      <div v-else class="text-sm text-gray-500">
        未打开项目
      </div>
    </aside>

    <!-- Main Content: Conversation -->
    <main class="flex-1 flex flex-col">
      <div class="flex-1 p-4 overflow-auto">
        <p class="text-gray-500">选择一个 AI 工具开始对话</p>
      </div>
    </main>

    <!-- Right Panel: File Preview -->
    <aside class="w-80 border-l border-gray-200 dark:border-gray-700 p-4">
      <h2 class="text-lg font-semibold mb-4">文件预览</h2>
      <div class="text-sm text-gray-500">
        选择文件查看内容
      </div>
    </aside>
  </div>
</template>
