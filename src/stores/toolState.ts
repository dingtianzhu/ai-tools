import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { AITool, InstalledTool, ToolProcess, HealthCheckResult } from '@/types';
import { invoke } from '@tauri-apps/api/core';

export const useToolStateStore = defineStore('toolState', () => {
  // State
  const availableTools = ref<AITool[]>([]);
  const installedTools = ref<Map<string, InstalledTool>>(new Map());
  const activeToolId = ref<string | null>(null);
  const toolProcesses = ref<Map<string, ToolProcess>>(new Map());

  // Getters
  const activeTool = computed(() =>
    activeToolId.value ? installedTools.value.get(activeToolId.value) : null
  );

  const installedToolList = computed(() => 
    Array.from(installedTools.value.values())
  );

  const readyTools = computed(() =>
    Array.from(installedTools.value.values()).filter(t => t.status === 'ready')
  );

  // Actions
  async function loadAvailableTools(): Promise<void> {
    try {
      const adapters = await invoke<AITool[]>('get_available_adapters');
      availableTools.value = adapters;
    } catch (error) {
      console.error('Failed to load available tools:', error);
      throw error;
    }
  }

  async function detectInstalledTools(): Promise<void> {
    for (const tool of availableTools.value) {
      try {
        const result = await invoke<{
          installed: boolean;
          version: string | null;
          path: string | null;
        }>('detect_cli_tool', { toolId: tool.id });

        if (result.installed) {
          installedTools.value.set(tool.id, {
            toolId: tool.id,
            version: result.version || 'unknown',
            configPath: result.path || '',
            status: 'ready',
            lastChecked: Date.now(),
          });
        }
      } catch (error) {
        console.error(`Failed to detect tool ${tool.id}:`, error);
      }
    }
  }

  async function checkToolHealth(toolId: string): Promise<HealthCheckResult> {
    try {
      const result = await invoke<HealthCheckResult>('run_health_check', { toolId });
      
      // Update installed tool status based on health check
      const installed = installedTools.value.get(toolId);
      if (installed) {
        installed.status = result.status === 'healthy' ? 'ready' : 'error';
        installed.lastChecked = Date.now();
        if (result.version) {
          installed.version = result.version;
        }
      }

      return result;
    } catch (error) {
      console.error(`Health check failed for ${toolId}:`, error);
      throw error;
    }
  }

  async function getToolConfig(toolId: string): Promise<string> {
    try {
      return await invoke<string>('read_tool_config', { toolId });
    } catch (error) {
      console.error(`Failed to read config for ${toolId}:`, error);
      throw error;
    }
  }

  async function saveToolConfig(toolId: string, content: string): Promise<void> {
    try {
      await invoke('write_tool_config', { toolId, content });
    } catch (error) {
      console.error(`Failed to save config for ${toolId}:`, error);
      throw error;
    }
  }

  async function startToolProcess(toolId: string, projectPath: string): Promise<void> {
    try {
      const pid = await invoke<number>('spawn_cli_process', {
        toolId,
        workingDir: projectPath,
        args: [],
      });

      toolProcesses.value.set(toolId, {
        toolId,
        pid,
        status: 'running',
      });

      activeToolId.value = toolId;
    } catch (error) {
      console.error(`Failed to start process for ${toolId}:`, error);
      throw error;
    }
  }

  async function stopToolProcess(toolId: string): Promise<void> {
    const process = toolProcesses.value.get(toolId);
    if (!process) return;

    try {
      await invoke('kill_process', { pid: process.pid });
      process.status = 'stopped';
      
      if (activeToolId.value === toolId) {
        activeToolId.value = null;
      }
    } catch (error) {
      console.error(`Failed to stop process for ${toolId}:`, error);
      throw error;
    }
  }

  async function sendMessage(toolId: string, message: string): Promise<void> {
    const process = toolProcesses.value.get(toolId);
    if (!process || process.status !== 'running') {
      throw new Error(`No running process for tool: ${toolId}`);
    }

    try {
      await invoke('send_to_process', { pid: process.pid, input: message });
    } catch (error) {
      console.error(`Failed to send message to ${toolId}:`, error);
      throw error;
    }
  }

  function setActiveTool(toolId: string | null): void {
    activeToolId.value = toolId;
  }

  // Persistence
  function loadFromStorage(data: {
    installedTools?: Array<[string, InstalledTool]>;
  }): void {
    if (data.installedTools) {
      installedTools.value = new Map(data.installedTools);
    }
  }

  function toStorageData(): {
    installedTools: Array<[string, InstalledTool]>;
  } {
    return {
      installedTools: Array.from(installedTools.value.entries()),
    };
  }

  return {
    // State
    availableTools,
    installedTools,
    activeToolId,
    toolProcesses,
    // Getters
    activeTool,
    installedToolList,
    readyTools,
    // Actions
    loadAvailableTools,
    detectInstalledTools,
    checkToolHealth,
    getToolConfig,
    saveToolConfig,
    startToolProcess,
    stopToolProcess,
    sendMessage,
    setActiveTool,
    loadFromStorage,
    toStorageData,
  };
});
