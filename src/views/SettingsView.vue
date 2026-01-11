<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();
</script>

<template>
  <div class="p-8 max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold mb-8">设置</h1>
    
    <div class="space-y-6">
      <div>
        <label class="block text-sm font-medium mb-2">主题</label>
        <select
          v-model="settingsStore.theme"
          class="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">编辑器字体大小</label>
        <input
          v-model.number="settingsStore.editorFontSize"
          type="number"
          min="10"
          max="24"
          class="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
        />
      </div>

      <div class="flex items-center">
        <input
          v-model="settingsStore.autoSave"
          type="checkbox"
          id="autoSave"
          class="mr-2"
        />
        <label for="autoSave" class="text-sm">自动保存</label>
      </div>
    </div>
  </div>
</template>
