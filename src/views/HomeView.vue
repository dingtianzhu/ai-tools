<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const openProject = () => {
  router.push('/project');
};
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-8">
    <h1 class="text-4xl font-bold mb-8">AI Tool Manager</h1>
    <p class="text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
      统一管理和协调多种 AI CLI 工具的跨平台桌面应用
    </p>
    <button
      @click="openProject"
      class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      打开项目
    </button>
  </div>
</template>
