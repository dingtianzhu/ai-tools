// Project types
export interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  aiToolsUsed: string[];
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  expanded?: boolean;
  size?: number;
  modified?: number;
}

// Session types
export interface Session {
  id: string;
  projectId: string;
  toolId: string;
  createdAt: number;
  updatedAt: number;
  title: string;
}

export interface Conversation {
  id: string;
  sessionId: string;
  messages: Message[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Tool types
export interface AITool {
  id: string;
  name: string;
  description: string;
  installCommand: Record<string, string>;
  configPath: Record<string, string>;
  healthCheckCommand: string;
}

export interface InstalledTool {
  toolId: string;
  version: string;
  configPath: string;
  status: 'ready' | 'not_configured' | 'error';
  lastChecked: number;
}

export interface ToolProcess {
  toolId: string;
  pid: number;
  status: 'running' | 'stopped' | 'error';
}

export interface HealthCheckResult {
  toolId: string;
  status: 'healthy' | 'unhealthy';
  version?: string;
  errors?: string[];
  suggestions?: string[];
}

// Settings types
export interface PromptTemplate {
  id: string;
  name: string;
  modelType: string;
  template: string;
  variables: string[];
}

export type ThemeMode = 'light' | 'dark' | 'system';

// File system types (from Tauri backend)
export interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  modified: number;
}

// Stream message types
export interface StreamMessage {
  type: 'start' | 'chunk' | 'end' | 'error';
  content?: string;
  metadata?: {
    toolId: string;
    timestamp: number;
    fileChanges?: FileChange[];
  };
}

export interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  diff?: string;
  newContent?: string;
}
