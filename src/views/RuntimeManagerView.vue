<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRuntimeStore, type AIRuntime } from '@/stores/runtime';

const runtimeStore = useRuntimeStore();
const selectedRuntimeId = ref<string | null>(null);
const showLogs = ref(false);
const logs = ref<string[]>([]);
const customRuntimePath = ref('');
const isAddingCustom = ref(false);

// Computed
const selectedRuntime = computed(() =>
  selectedRuntimeId.value
    ? runtimeStore.runtimes.get(selectedRuntimeId.value)
    : null
);

// Lifecycle
let stopPolling: (() => void) | null = null;

onMounted(async () => {
  // Scan for runtimes on mount
  await runtimeStore.scanForRuntimes();
  
  // Start polling for status updates
  stopPolling = runtimeStore.startStatusPolling(5000);
});

onUnmounted(() => {
  // Stop polling when component unmounts
  if (stopPolling) {
    stopPolling();
  }
});

// Methods
async function handleScanRuntimes() {
  await runtimeStore.scanForRuntimes();
}

async function handleStartRuntime(runtime: AIRuntime) {
  try {
    await runtimeStore.startRuntime(runtime.id);
  } catch (error) {
    console.error('Failed to start runtime:', error);
    alert(`Failed to start ${runtime.name}: ${error}`);
  }
}

async function handleStopRuntime(runtime: AIRuntime) {
  try {
    await runtimeStore.stopRuntime(runtime.id);
  } catch (error) {
    console.error('Failed to stop runtime:', error);
    alert(`Failed to stop ${runtime.name}: ${error}`);
  }
}

async function handleRestartRuntime(runtime: AIRuntime) {
  try {
    await runtimeStore.restartRuntime(runtime.id);
  } catch (error) {
    console.error('Failed to restart runtime:', error);
    alert(`Failed to restart ${runtime.name}: ${error}`);
  }
}

async function handleViewLogs(runtime: AIRuntime) {
  selectedRuntimeId.value = runtime.id;
  showLogs.value = true;
  
  try {
    logs.value = await runtimeStore.getLogs(runtime.id);
  } catch (error) {
    console.error('Failed to load logs:', error);
    logs.value = ['Failed to load logs'];
  }
}

function closeLogs() {
  showLogs.value = false;
  logs.value = [];
}

async function handleAddCustomRuntime() {
  if (!customRuntimePath.value.trim()) {
    alert('Please enter a valid path');
    return;
  }

  try {
    await runtimeStore.addCustomRuntime(customRuntimePath.value);
    customRuntimePath.value = '';
    isAddingCustom.value = false;
  } catch (error) {
    console.error('Failed to add custom runtime:', error);
    alert(`Failed to add custom runtime: ${error}`);
  }
}

function getStatusColor(status: AIRuntime['status']): string {
  switch (status) {
    case 'running':
      return 'text-green-600 dark:text-green-400';
    case 'stopped':
      return 'text-gray-600 dark:text-gray-400';
    case 'error':
      return 'text-red-600 dark:text-red-400';
    case 'not_installed':
      return 'text-yellow-600 dark:text-yellow-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

function getStatusIcon(status: AIRuntime['status']): string {
  switch (status) {
    case 'running':
      return '●';
    case 'stopped':
      return '○';
    case 'error':
      return '✕';
    case 'not_installed':
      return '⚠';
    default:
      return '○';
  }
}

function formatMemory(mb: number | undefined): string {
  if (mb === undefined) return 'N/A';
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatLastChecked(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Main Content -->
    <main class="flex-1 flex flex-col">
      <!-- Header -->
      <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div class="flex items-center justify-between">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            AI 运行时管理
          </h1>
          <div class="flex gap-2">
            <button
              @click="isAddingCustom = !isAddingCustom"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              添加自定义运行时
            </button>
            <button
              @click="handleScanRuntimes"
              :disabled="runtimeStore.isScanning"
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50"
            >
              {{ runtimeStore.isScanning ? '扫描中...' : '扫描运行时' }}
            </button>
          </div>
        </div>

        <!-- Add Custom Runtime Form -->
        <div v-if="isAddingCustom" class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
          <h3 class="text-lg font-semibold mb-2">添加自定义运行时</h3>
          <div class="flex gap-2">
            <input
              v-model="customRuntimePath"
              type="text"
              placeholder="输入可执行文件路径"
              class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <button
              @click="handleAddCustomRuntime"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              添加
            </button>
            <button
              @click="isAddingCustom = false"
              class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              取消
            </button>
          </div>
        </div>
      </header>

      <!-- Runtime List -->
      <div class="flex-1 overflow-auto p-4">
        <div v-if="runtimeStore.runtimeList.length === 0" class="text-center py-12">
          <p class="text-gray-500 dark:text-gray-400 text-lg">
            未检测到 AI 运行时
          </p>
          <p class="text-gray-400 dark:text-gray-500 text-sm mt-2">
            点击"扫描运行时"按钮开始检测
          </p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="runtime in runtimeStore.runtimeList"
            :key="runtime.id"
            class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
          >
            <!-- Runtime Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ runtime.name }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ runtime.type }}
                </p>
              </div>
              <span :class="['text-2xl', getStatusColor(runtime.status)]">
                {{ getStatusIcon(runtime.status) }}
              </span>
            </div>

            <!-- Runtime Info -->
            <div class="space-y-2 mb-4">
              <div class="text-sm">
                <span class="text-gray-600 dark:text-gray-400">状态:</span>
                <span :class="['ml-2 font-medium', getStatusColor(runtime.status)]">
                  {{ runtime.status }}
                </span>
              </div>
              
              <div v-if="runtime.version" class="text-sm">
                <span class="text-gray-600 dark:text-gray-400">版本:</span>
                <span class="ml-2 text-gray-900 dark:text-white">
                  {{ runtime.version }}
                </span>
              </div>

              <div v-if="runtime.port" class="text-sm">
                <span class="text-gray-600 dark:text-gray-400">端口:</span>
                <span class="ml-2 text-gray-900 dark:text-white">
                  {{ runtime.port }}
                </span>
              </div>

              <div v-if="runtime.memoryUsage !== undefined" class="text-sm">
                <span class="text-gray-600 dark:text-gray-400">内存:</span>
                <span class="ml-2 text-gray-900 dark:text-white">
                  {{ formatMemory(runtime.memoryUsage) }}
                </span>
              </div>

              <div v-if="runtime.vramUsage !== undefined" class="text-sm">
                <span class="text-gray-600 dark:text-gray-400">显存:</span>
                <span class="ml-2 text-gray-900 dark:text-white">
                  {{ formatMemory(runtime.vramUsage) }}
                </span>
              </div>

              <div class="text-xs text-gray-500 dark:text-gray-400">
                最后检查: {{ formatLastChecked(runtime.lastChecked) }}
              </div>
            </div>

            <!-- Runtime Actions -->
            <div class="flex gap-2">
              <button
                v-if="runtime.status === 'stopped'"
                @click="handleStartRuntime(runtime)"
                class="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
              >
                启动
              </button>
              
              <button
                v-if="runtime.status === 'running'"
                @click="handleStopRuntime(runtime)"
                class="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
              >
                停止
              </button>

              <button
                v-if="runtime.status === 'running'"
                @click="handleRestartRuntime(runtime)"
                class="flex-1 px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition"
              >
                重启
              </button>

              <button
                @click="handleViewLogs(runtime)"
                class="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
              >
                日志
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Logs Panel (Modal) -->
    <div
      v-if="showLogs"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="closeLogs"
    >
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-3/4 h-3/4 flex flex-col">
        <!-- Logs Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            运行时日志 - {{ selectedRuntime?.name }}
          </h2>
          <button
            @click="closeLogs"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <!-- Logs Content -->
        <div class="flex-1 overflow-auto p-4 bg-gray-900 text-gray-100 font-mono text-sm">
          <div v-if="logs.length === 0" class="text-gray-500">
            暂无日志
          </div>
          <div v-else>
            <div v-for="(log, index) in logs" :key="index" class="mb-1">
              {{ log }}
            </div>
          </div>
        </div>

        <!-- Logs Footer -->
        <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            @click="closeLogs"
            class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>
