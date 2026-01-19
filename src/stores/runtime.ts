import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { loadRuntimes, saveRuntimes, type RuntimesData } from '@/utils/store';

// Runtime types
export interface AIRuntime {
  id: string;
  name: string;
  type: 'ollama' | 'localai' | 'python' | 'docker' | 'custom';
  executablePath: string;
  version: string | null;
  status: 'running' | 'stopped' | 'not_installed' | 'error';
  memoryUsage?: number; // MB
  vramUsage?: number; // MB (if GPU available)
  port?: number;
  lastChecked: number;
}

export interface RuntimeStatus {
  status: 'running' | 'stopped' | 'error';
  version?: string;
  uptime_seconds?: number;
  port?: number;
  error?: string;
}

export interface ResourceUsage {
  memory_mb: number;
  vram_mb?: number;
  cpu_percent: number;
}

export interface DetectedRuntime {
  id: string;
  name: string;
  runtime_type: string;
  executable_path: string;
  version: string | null;
  auto_detected: boolean;
}

export const useRuntimeStore = defineStore('runtime', () => {
  // State
  const runtimes = ref<Map<string, AIRuntime>>(new Map());
  const activeRuntimeId = ref<string | null>(null);
  const logs = ref<Map<string, string[]>>(new Map());
  const isScanning = ref(false);
  const lastScan = ref<number>(0);

  // Getters
  const activeRuntime = computed(() =>
    activeRuntimeId.value ? runtimes.value.get(activeRuntimeId.value) : null
  );

  const runtimeList = computed(() => Array.from(runtimes.value.values()));

  const runningRuntimes = computed(() =>
    Array.from(runtimes.value.values()).filter((r) => r.status === 'running')
  );

  const availableRuntimes = computed(() =>
    Array.from(runtimes.value.values()).filter(
      (r) => r.status !== 'not_installed'
    )
  );

  const customRuntimes = computed(() =>
    Array.from(runtimes.value.values()).filter((r) => r.type === 'custom')
  );

  // Auto-save custom runtimes when they change
  watch(
    [runtimes, lastScan],
    async () => {
      await persistRuntimes();
    },
    { deep: true }
  );

  // Actions

  /**
   * Scan system for AI runtimes
   */
  async function scanForRuntimes(): Promise<void> {
    isScanning.value = true;
    try {
      const detected = await invoke<DetectedRuntime[]>('scan_runtimes');

      // Convert detected runtimes to AIRuntime format
      for (const runtime of detected) {
        const existing = runtimes.value.get(runtime.id);
        
        runtimes.value.set(runtime.id, {
          id: runtime.id,
          name: runtime.name,
          type: runtime.runtime_type as AIRuntime['type'],
          executablePath: runtime.executable_path,
          version: runtime.version,
          status: existing?.status || 'stopped',
          lastChecked: Date.now(),
        });
      }

      // Update status for all detected runtimes
      for (const runtime of detected) {
        await updateRuntimeStatus(runtime.id);
      }

      lastScan.value = Date.now();
    } catch (error) {
      console.error('Failed to scan runtimes:', error);
      throw error;
    } finally {
      isScanning.value = false;
    }
  }

  /**
   * Add a custom runtime manually
   */
  async function addCustomRuntime(path: string): Promise<AIRuntime> {
    try {
      const info = await invoke<{
        valid: boolean;
        version: string | null;
        capabilities: string[];
      }>('validate_runtime_path', { path });

      if (!info.valid) {
        throw new Error('Invalid runtime path');
      }

      // Generate ID from path
      const id = `custom_${path.split('/').pop() || 'runtime'}`;

      const runtime: AIRuntime = {
        id,
        name: path.split('/').pop() || 'Custom Runtime',
        type: 'custom',
        executablePath: path,
        version: info.version,
        status: 'stopped',
        lastChecked: Date.now(),
      };

      runtimes.value.set(id, runtime);
      return runtime;
    } catch (error) {
      console.error('Failed to add custom runtime:', error);
      throw error;
    }
  }

  /**
   * Start a runtime
   */
  async function startRuntime(runtimeId: string): Promise<void> {
    const runtime = runtimes.value.get(runtimeId);
    if (!runtime) {
      throw new Error(`Runtime not found: ${runtimeId}`);
    }

    try {
      await invoke('start_runtime', {
        runtimeId,
        executablePath: runtime.executablePath,
        args: [],
        workingDir: null,
      });

      runtime.status = 'running';
      runtime.lastChecked = Date.now();

      // Update status after a short delay
      setTimeout(() => updateRuntimeStatus(runtimeId), 1000);
    } catch (error) {
      runtime.status = 'error';
      console.error(`Failed to start runtime ${runtimeId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a runtime
   */
  async function stopRuntime(runtimeId: string): Promise<void> {
    const runtime = runtimes.value.get(runtimeId);
    if (!runtime) {
      throw new Error(`Runtime not found: ${runtimeId}`);
    }

    try {
      await invoke('stop_runtime', { runtimeId });

      runtime.status = 'stopped';
      runtime.lastChecked = Date.now();
      runtime.memoryUsage = undefined;
      runtime.vramUsage = undefined;
    } catch (error) {
      runtime.status = 'error';
      console.error(`Failed to stop runtime ${runtimeId}:`, error);
      throw error;
    }
  }

  /**
   * Restart a runtime
   */
  async function restartRuntime(runtimeId: string): Promise<void> {
    try {
      await stopRuntime(runtimeId);
      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await startRuntime(runtimeId);
    } catch (error) {
      console.error(`Failed to restart runtime ${runtimeId}:`, error);
      throw error;
    }
  }

  /**
   * Get runtime status
   */
  async function getStatus(runtimeId: string): Promise<RuntimeStatus> {
    try {
      return await invoke<RuntimeStatus>('get_runtime_status', { runtimeId });
    } catch (error) {
      console.error(`Failed to get status for ${runtimeId}:`, error);
      throw error;
    }
  }

  /**
   * Update runtime status
   */
  async function updateRuntimeStatus(runtimeId: string): Promise<void> {
    const runtime = runtimes.value.get(runtimeId);
    if (!runtime) return;

    try {
      const status = await getStatus(runtimeId);
      
      runtime.status = status.status as AIRuntime['status'];
      runtime.version = status.version || runtime.version;
      runtime.port = status.port;
      runtime.lastChecked = Date.now();

      // Also update resource usage if running
      if (status.status === 'running') {
        await updateResourceUsage(runtimeId);
      }
    } catch (error) {
      console.error(`Failed to update status for ${runtimeId}:`, error);
      runtime.status = 'error';
    }
  }

  /**
   * Stream logs from a runtime
   */
  async function* streamLogs(runtimeId: string): AsyncIterator<string> {
    // This is a placeholder implementation
    // In a real implementation, this would use Tauri events or WebSocket
    const runtime = runtimes.value.get(runtimeId);
    if (!runtime) {
      throw new Error(`Runtime not found: ${runtimeId}`);
    }

    // Get current logs
    const currentLogs = logs.value.get(runtimeId) || [];
    for (const log of currentLogs) {
      yield log;
    }
  }

  /**
   * Get logs for a runtime
   */
  async function getLogs(runtimeId: string): Promise<string[]> {
    try {
      const logLines = await invoke<string[]>('stream_process_output', {
        pid: 0, // This would need to be tracked per runtime
      });
      
      logs.value.set(runtimeId, logLines);
      return logLines;
    } catch (error) {
      console.error(`Failed to get logs for ${runtimeId}:`, error);
      return [];
    }
  }

  /**
   * Estimate resource usage for a runtime
   */
  async function estimateResourceUsage(
    runtimeId: string
  ): Promise<ResourceUsage> {
    try {
      return await invoke<ResourceUsage>('estimate_resource_usage', {
        runtimeId,
      });
    } catch (error) {
      console.error(`Failed to estimate resource usage for ${runtimeId}:`, error);
      throw error;
    }
  }

  /**
   * Update resource usage for a runtime
   */
  async function updateResourceUsage(runtimeId: string): Promise<void> {
    const runtime = runtimes.value.get(runtimeId);
    if (!runtime || runtime.status !== 'running') return;

    try {
      const usage = await estimateResourceUsage(runtimeId);
      runtime.memoryUsage = usage.memory_mb;
      runtime.vramUsage = usage.vram_mb;
    } catch (error) {
      console.error(`Failed to update resource usage for ${runtimeId}:`, error);
    }
  }

  /**
   * Set active runtime
   */
  function setActiveRuntime(runtimeId: string | null): void {
    activeRuntimeId.value = runtimeId;
  }

  /**
   * Remove a runtime
   */
  function removeRuntime(runtimeId: string): void {
    runtimes.value.delete(runtimeId);
    logs.value.delete(runtimeId);
    
    if (activeRuntimeId.value === runtimeId) {
      activeRuntimeId.value = null;
    }
  }

  /**
   * Start periodic status updates
   */
  function startStatusPolling(intervalMs: number = 5000): () => void {
    const interval = setInterval(async () => {
      for (const runtime of runtimes.value.values()) {
        if (runtime.status === 'running') {
          await updateRuntimeStatus(runtime.id);
        }
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  }

  // Persistence
  async function loadFromStore(): Promise<void> {
    try {
      const data = await loadRuntimes();
      
      // Load custom runtimes
      for (const runtime of data.customRuntimes) {
        runtimes.value.set(runtime.id, {
          id: runtime.id,
          name: runtime.name,
          type: runtime.type as AIRuntime['type'],
          executablePath: runtime.executablePath,
          version: runtime.version,
          status: runtime.status as AIRuntime['status'],
          lastChecked: runtime.lastChecked,
        });
      }
      
      lastScan.value = data.lastScan;
    } catch (error) {
      console.error('Failed to load runtimes from store:', error);
    }
  }

  async function persistRuntimes(): Promise<void> {
    try {
      const data: RuntimesData = {
        version: 1,
        customRuntimes: customRuntimes.value.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          executablePath: r.executablePath,
          version: r.version,
          status: r.status,
          lastChecked: r.lastChecked,
        })),
        lastScan: lastScan.value,
      };
      await saveRuntimes(data);
    } catch (error) {
      console.error('Failed to persist runtimes:', error);
    }
  }

  // Legacy methods for backward compatibility
  function loadFromStorage(data: {
    runtimes?: Array<[string, AIRuntime]>;
    activeRuntimeId?: string | null;
  }): void {
    if (data.runtimes) {
      runtimes.value = new Map(data.runtimes);
    }
    if (data.activeRuntimeId !== undefined) {
      activeRuntimeId.value = data.activeRuntimeId;
    }
  }

  function toStorageData(): {
    runtimes: Array<[string, AIRuntime]>;
    activeRuntimeId: string | null;
  } {
    return {
      runtimes: Array.from(runtimes.value.entries()),
      activeRuntimeId: activeRuntimeId.value,
    };
  }

  return {
    // State
    runtimes,
    activeRuntimeId,
    logs,
    isScanning,
    lastScan,
    // Getters
    activeRuntime,
    runtimeList,
    runningRuntimes,
    availableRuntimes,
    customRuntimes,
    // Actions
    scanForRuntimes,
    addCustomRuntime,
    startRuntime,
    stopRuntime,
    restartRuntime,
    getStatus,
    updateRuntimeStatus,
    streamLogs,
    getLogs,
    estimateResourceUsage,
    updateResourceUsage,
    setActiveRuntime,
    removeRuntime,
    startStatusPolling,
    loadFromStore,
    persistRuntimes,
    loadFromStorage,
    toStorageData,
  };
});
