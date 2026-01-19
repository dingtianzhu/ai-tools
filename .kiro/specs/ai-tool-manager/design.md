# Design Document: OmniAI Studio

## Overview

OmniAI Studio 是一个基于 Tauri 2.0 + Vue3 + TypeScript + Pinia 的跨平台桌面应用，旨在为开发者提供统一的本地 AI 工具管理和开发工作流平台。应用采用前后端分离架构，前端使用 Vue3 构建响应式 IDE 风格 UI，后端使用 Rust 处理系统级操作（进程管理、文件系统访问、资源监控）。核心功能包括 AI 运行时管理、项目开发优化、配置管理、对话系统、提示词工程实验室、以及 MCP 与 Agent Skills 管理。

### 技术栈

- **前端**: Vue 3 (Script Setup) + TypeScript + Pinia + Vue Router + Vite
- **UI 组件**: Naive UI (或 Shadcn-vue) + TailwindCSS
- **Markdown 渲染**: markdown-it + highlight.js
- **代码编辑**: Monaco Editor (可选，用于配置编辑)
- **后端**: Tauri 2.0 (Rust)
- **数据存储**: SQLite (对话历史) + Tauri Plugin Store (配置)
- **进程管理**: Tauri shell API + 自定义进程监控
- **安全存储**: Tauri Plugin Keyring (系统级密钥存储)
- **状态管理**: Pinia
- **AI 通信**: HTTP/WebSocket (本地 AI 服务) + Stdio (CLI 交互)

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           OmniAI Studio                                  │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                      Vue 3 Frontend Layer                          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │  │
│  │  │ Runtime  │  │ Project  │  │Conversa- │  │  Prompt Lab      │  │  │
│  │  │ Manager  │  │  View    │  │tion View │  │  & Templates     │  │  │
│  │  │  View    │  │          │  │          │  │                  │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────────────┘  │  │
│  │       │              │             │             │                │  │
│  │  ┌────┴──────────────┴─────────────┴─────────────┴──────────────┐  │  │
│  │  │                  Pinia State Management                       │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │  │
│  │  │  │ Runtime  │ │ Project  │ │ Session  │ │  Prompt & MCP    │ │  │  │
│  │  │  │  Store   │ │  Store   │ │  Store   │ │     Store        │ │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │  │
│  │  │  │  Config  │ │  Skills  │ │ Settings │ │   Token          │ │  │  │
│  │  │  │  Store   │ │  Store   │ │  Store   │ │   Estimator      │ │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │  │  │
│  │  └────────────────────────┬─────────────────────────────────────┘  │  │
│  └───────────────────────────┼────────────────────────────────────────┘  │
│                              │ Tauri IPC (Commands & Events)            │
│  ┌───────────────────────────┼────────────────────────────────────────┐  │
│  │                  Tauri Backend (Rust) Layer                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │  FileSystem  │  │   Runtime    │  │    CLI Adapter           │ │  │
│  │  │   Service    │  │   Monitor    │  │    Registry              │ │  │
│  │  │              │  │              │  │  (Ollama, LocalAI, etc)  │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │   Process    │  │     MCP      │  │    Config Manager        │ │  │
│  │  │   Manager    │  │   Service    │  │  (Read/Write/Validate)   │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │    Skills    │  │   Secure     │  │    Database Service      │ │  │
│  │  │   Executor   │  │   Storage    │  │    (SQLite for chats)    │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    External Integrations                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │ Local AI     │  │ MCP Servers  │  │  System Resources        │ │  │
│  │  │ Services     │  │ (External)   │  │  (CPU, Memory, GPU)      │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 层次结构

1. **表现层 (Vue Components)**: 负责 UI 渲染和用户交互，采用 IDE 风格三栏布局
2. **状态层 (Pinia Stores)**: 管理应用状态，处理业务逻辑，协调前后端通信
3. **服务层 (Tauri Commands)**: 通过 IPC 调用 Rust 后端服务，提供系统级能力
4. **系统层 (Rust Backend)**: 处理文件系统、进程管理、CLI 交互、资源监控
5. **集成层 (External)**: 与本地 AI 服务、MCP 服务器、系统资源交互

## Components and Interfaces

### Frontend Components

#### 1. RuntimeManagerView 组件

```typescript
// src/components/RuntimeManagerView.vue
interface RuntimeManagerViewProps {
  // 无需 props，从 store 获取数据
}

interface AIRuntime {
  id: string;
  name: string;
  type: 'ollama' | 'localai' | 'python' | 'docker' | 'custom';
  executablePath: string;
  version: string;
  status: 'running' | 'stopped' | 'not_installed' | 'error';
  memoryUsage?: number; // MB
  vramUsage?: number; // MB (if GPU available)
  port?: number;
  lastChecked: number;
}

interface RuntimeControlProps {
  runtime: AIRuntime;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onViewLogs: () => void;
}

interface RuntimeLogsProps {
  runtimeId: string;
  logs: string[];
  isStreaming: boolean;
}
```

#### 2. ProjectView 组件

```typescript
// src/components/ProjectView.vue
interface ProjectViewProps {
  projectPath: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  expanded?: boolean;
  selected?: boolean; // 用于上下文注入
  ignored?: boolean; // .gitignore 过滤
}

interface ProjectPathInputProps {
  modelValue: string;
  placeholder?: string;
  recentProjects?: Project[];
}

interface PathValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
}

interface ContextPanelProps {
  selectedFiles: string[];
  tokenCount: number;
  tokenLimit: number;
  onRemoveFile: (path: string) => void;
  onClearAll: () => void;
}
```

#### 3. ConversationView 组件

```typescript
// src/components/ConversationView.vue
interface ConversationViewProps {
  sessionId: string;
}

interface MessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolName?: string;
  metadata?: {
    fileChanges?: FileChange[];
    skillExecutions?: SkillExecution[];
  };
}

interface MessageInputProps {
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  onSend: (message: string) => void;
  onAttachContext: () => void;
}

interface CodeBlockProps {
  code: string;
  language: string;
  onCopy: () => void;
  onInsertToFile: () => void;
}
```

#### 4. DiffView 组件

```typescript
// src/components/DiffView.vue
interface DiffViewProps {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  mode: 'side-by-side' | 'unified';
}

interface DiffViewActions {
  onApprove: () => void;
  onReject: () => void;
  onEdit: (content: string) => void;
}
```

#### 5. PromptLabView 组件

```typescript
// src/components/PromptLabView.vue
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  modelType: string;
  template: string;
  variables: TemplateVariable[];
  isBuiltIn: boolean;
}

interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'code';
  required: boolean;
  defaultValue?: string;
}

interface MagicEnhanceProps {
  briefDescription: string;
  targetModel: string;
  projectContext?: string;
  onEnhanced: (enhancedPrompt: string) => void;
}

interface ABTestProps {
  variants: PromptVariant[];
  onRunTest: () => void;
  onRateResponse: (variantId: string, rating: number) => void;
}

interface PromptVariant {
  id: string;
  name: string;
  prompt: string;
  response?: string;
  rating?: number;
}
```

#### 6. ConfigHubView 组件

```typescript
// src/components/ConfigHubView.vue
interface ConfigFile {
  id: string;
  name: string;
  path: string;
  type: 'env' | 'yaml' | 'json' | 'toml' | 'modelfile';
  content: string;
  modified: boolean;
  lastSaved: number;
}

interface ConfigEditorProps {
  config: ConfigFile;
  mode: 'form' | 'source';
  onSave: (content: string) => void;
  onValidate: (content: string) => ValidationResult;
}

interface ConfigHistoryProps {
  configId: string;
  versions: ConfigVersion[];
  onRestore: (versionId: string) => void;
}

interface ConfigVersion {
  id: string;
  timestamp: number;
  content: string;
  description?: string;
}

interface ModelParametersProps {
  modelType: string;
  parameters: ModelParameter[];
  onParameterChange: (name: string, value: number) => void;
}

interface ModelParameter {
  name: string;
  description: string;
  min: number;
  max: number;
  step: number;
  value: number;
  recommendedRange?: [number, number];
}
```

#### 7. MCPView 组件

```typescript
// src/components/MCPView.vue
interface MCPServer {
  id: string;
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  resources: MCPResource[];
  tools: MCPTool[];
}

interface MCPResource {
  id: string;
  type: 'database' | 'filesystem' | 'api' | 'browser';
  name: string;
  description: string;
  inUse: boolean;
}

interface MCPTool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
}

interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}
```

#### 8. SkillsView 组件

```typescript
// src/components/SkillsView.vue
interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: 'file' | 'terminal' | 'network' | 'custom';
  requiresApproval: boolean;
  parameters: SkillParameter[];
  implementation?: string; // 可选的自定义实现代码
}

interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'path';
  description: string;
  required: boolean;
}

interface SkillExecution {
  id: string;
  skillId: string;
  timestamp: number;
  parameters: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

interface SkillApprovalProps {
  execution: SkillExecution;
  onApprove: () => void;
  onDeny: () => void;
}

interface WorkflowEditorProps {
  workflow: Workflow;
  availableSkills: AgentSkill[];
  onSave: (workflow: Workflow) => void;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowNode {
  id: string;
  type: 'skill' | 'condition' | 'start' | 'end';
  skillId?: string;
  position: { x: number; y: number };
  data?: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  condition?: string;
}
```

### Pinia Stores

#### 1. RuntimeStore

```typescript
// src/stores/runtime.ts
interface RuntimeState {
  runtimes: Map<string, AIRuntime>;
  activeRuntimeId: string | null;
  logs: Map<string, string[]>; // runtimeId -> logs
  isScanning: boolean;
}

interface RuntimeActions {
  scanForRuntimes(): Promise<void>;
  addCustomRuntime(path: string): Promise<AIRuntime>;
  startRuntime(runtimeId: string): Promise<void>;
  stopRuntime(runtimeId: string): Promise<void>;
  restartRuntime(runtimeId: string): Promise<void>;
  getStatus(runtimeId: string): Promise<RuntimeStatus>;
  streamLogs(runtimeId: string): AsyncIterator<string>;
  estimateResourceUsage(runtimeId: string): Promise<ResourceUsage>;
}

interface RuntimeStatus {
  status: 'running' | 'stopped' | 'error';
  version?: string;
  uptime?: number;
  error?: string;
}

interface ResourceUsage {
  memoryMB: number;
  vramMB?: number;
  cpuPercent: number;
}
```

#### 2. ProjectStore

```typescript
// src/stores/project.ts
interface ProjectState {
  currentProject: Project | null;
  recentProjects: Project[];
  fileTree: FileTreeNode | null;
  selectedFiles: Set<string>; // 用于上下文注入
  fileContents: Map<string, string>;
  tokenCount: number;
}

interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  aiToolsUsed: string[];
  gitignoreRules?: string[];
}

interface ProjectActions {
  openProject(path: string): Promise<void>;
  closeProject(): void;
  refreshFileTree(): Promise<void>;
  selectFile(path: string): Promise<string>;
  toggleFileSelection(path: string): void;
  clearSelection(): void;
  calculateTokens(): Promise<number>;
  addToRecent(project: Project): void;
  validateProjectPath(path: string): Promise<PathValidationResult>;
  loadGitignore(): Promise<void>;
}

interface PathValidationResult {
  valid: boolean;
  error?: string;
  isDirectory?: boolean;
}
```

#### 3. SessionStore

```typescript
// src/stores/session.ts
interface SessionState {
  sessions: Map<string, Session>;
  currentSessionId: string | null;
  conversations: Map<string, Conversation>;
  searchResults: Session[];
}

interface Session {
  id: string;
  projectId: string;
  runtimeId: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  tags?: string[];
}

interface Conversation {
  id: string;
  sessionId: string;
  messages: Message[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  metadata?: {
    fileChanges?: FileChange[];
    skillExecutions?: SkillExecution[];
    tokenCount?: number;
  };
}

interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  diff?: string;
  newContent?: string;
}

interface SessionActions {
  createSession(projectId: string, runtimeId: string): Session;
  loadSessions(): Promise<void>;
  saveSessions(): Promise<void>;
  addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Message;
  searchSessions(query: string): Promise<Session[]>;
  deleteSession(sessionId: string): Promise<void>;
  exportSession(sessionId: string, format: 'markdown' | 'json' | 'pdf'): Promise<string>;
  renameSession(sessionId: string, title: string): void;
  groupByProject(): Map<string, Session[]>;
}
```

#### 4. PromptStore

```typescript
// src/stores/prompt.ts
interface PromptState {
  templates: Map<string, PromptTemplate>;
  categories: string[];
  abTests: Map<string, ABTest>;
  enhancementHistory: EnhancedPrompt[];
}

interface ABTest {
  id: string;
  name: string;
  variants: PromptVariant[];
  createdAt: number;
}

interface EnhancedPrompt {
  id: string;
  original: string;
  enhanced: string;
  timestamp: number;
  modelType: string;
}

interface PromptActions {
  loadTemplates(): Promise<void>;
  saveTemplate(template: PromptTemplate): Promise<void>;
  deleteTemplate(id: string): Promise<void>;
  generatePrompt(templateId: string, variables: Record<string, string>): string;
  enhancePrompt(brief: string, modelType: string, context?: string): Promise<string>;
  createABTest(name: string, variants: PromptVariant[]): ABTest;
  runABTest(testId: string): Promise<void>;
  rateVariant(testId: string, variantId: string, rating: number): void;
}
```

#### 5. ConfigStore

```typescript
// src/stores/config.ts
interface ConfigState {
  configs: Map<string, ConfigFile>;
  history: Map<string, ConfigVersion[]>;
  modelParameters: Map<string, ModelParameter[]>;
}

interface ConfigActions {
  scanConfigs(): Promise<void>;
  loadConfig(configId: string): Promise<string>;
  saveConfig(configId: string, content: string): Promise<void>;
  validateConfig(configId: string, content: string): Promise<ValidationResult>;
  createBackup(configId: string): Promise<void>;
  restoreVersion(configId: string, versionId: string): Promise<void>;
  getModelParameters(modelType: string): ModelParameter[];
  updateParameter(modelType: string, paramName: string, value: number): void;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}
```

#### 6. MCPStore

```typescript
// src/stores/mcp.ts
interface MCPState {
  servers: Map<string, MCPServer>;
  activeConnections: Set<string>;
  resources: Map<string, MCPResource[]>;
  tools: Map<string, MCPTool[]>;
}

interface MCPActions {
  connectServer(url: string): Promise<MCPServer>;
  disconnectServer(serverId: string): Promise<void>;
  discoverResources(serverId: string): Promise<MCPResource[]>;
  discoverTools(serverId: string): Promise<MCPTool[]>;
  invokeTool(serverId: string, toolId: string, params: Record<string, unknown>): Promise<unknown>;
  getResourceStatus(serverId: string, resourceId: string): Promise<ResourceStatus>;
}

interface ResourceStatus {
  available: boolean;
  lastAccessed?: number;
  error?: string;
}
```

#### 7. SkillsStore

```typescript
// src/stores/skills.ts
interface SkillsState {
  skills: Map<string, AgentSkill>;
  executions: Map<string, SkillExecution>;
  workflows: Map<string, Workflow>;
  pendingApprovals: SkillExecution[];
}

interface SkillsActions {
  registerSkill(skill: AgentSkill): void;
  unregisterSkill(skillId: string): void;
  executeSkill(skillId: string, params: Record<string, unknown>): Promise<SkillExecution>;
  approveExecution(executionId: string): Promise<void>;
  denyExecution(executionId: string): Promise<void>;
  getExecutionHistory(skillId?: string): SkillExecution[];
  saveWorkflow(workflow: Workflow): Promise<void>;
  executeWorkflow(workflowId: string, inputs: Record<string, unknown>): Promise<WorkflowResult>;
}

interface WorkflowResult {
  success: boolean;
  outputs: Record<string, unknown>;
  executedNodes: string[];
  failedNode?: string;
  error?: string;
}
```

#### 8. SettingsStore

```typescript
// src/stores/settings.ts
interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  editorFontSize: number;
  autoSave: boolean;
  panelSizes: PanelSizes;
  keyboardShortcuts: Map<string, string>;
  tokenLimits: Map<string, number>; // modelType -> limit
}

interface PanelSizes {
  navigation: number;
  main: number;
  context: number;
}

interface SettingsActions {
  loadSettings(): Promise<void>;
  saveSettings(): Promise<void>;
  setTheme(theme: 'light' | 'dark' | 'system'): void;
  setPanelSizes(sizes: PanelSizes): void;
  setKeyboardShortcut(action: string, shortcut: string): void;
  resetToDefaults(): void;
}
```

### Tauri Backend Services

#### 1. FileSystemService

```rust
// src-tauri/src/filesystem.rs

#[tauri::command]
async fn read_directory(path: String, respect_gitignore: bool) -> Result<Vec<FileEntry>, String>;

#[tauri::command]
async fn read_file(path: String) -> Result<String, String>;

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String>;

#[tauri::command]
async fn watch_file(path: String) -> Result<(), String>;

#[tauri::command]
async fn validate_path(path: String) -> Result<PathValidation, String>;

#[tauri::command]
async fn load_gitignore(project_path: String) -> Result<Vec<String>, String>;

#[tauri::command]
async fn apply_file_changes(changes: Vec<FileChange>) -> Result<(), String>;

struct FileEntry {
    name: String,
    path: String,
    is_directory: bool,
    size: u64,
    modified: u64,
    ignored: bool,
}

struct PathValidation {
    exists: bool,
    is_directory: bool,
    is_readable: bool,
    absolute_path: String,
}

struct FileChange {
    path: String,
    change_type: String, // "create", "modify", "delete"
    content: Option<String>,
}
```

#### 2. RuntimeMonitor

```rust
// src-tauri/src/runtime_monitor.rs

#[tauri::command]
async fn scan_runtimes() -> Result<Vec<DetectedRuntime>, String>;

#[tauri::command]
async fn get_runtime_status(runtime_id: String) -> Result<RuntimeStatus, String>;

#[tauri::command]
async fn estimate_resource_usage(runtime_id: String) -> Result<ResourceUsage, String>;

#[tauri::command]
async fn validate_runtime_path(path: String) -> Result<RuntimeInfo, String>;

struct DetectedRuntime {
    id: String,
    name: String,
    runtime_type: String, // "ollama", "localai", "python", "docker", "custom"
    executable_path: String,
    version: Option<String>,
    auto_detected: bool,
}

struct RuntimeStatus {
    status: String, // "running", "stopped", "error"
    version: Option<String>,
    uptime_seconds: Option<u64>,
    port: Option<u16>,
    error: Option<String>,
}

struct ResourceUsage {
    memory_mb: f64,
    vram_mb: Option<f64>,
    cpu_percent: f64,
}

struct RuntimeInfo {
    valid: bool,
    version: Option<String>,
    capabilities: Vec<String>,
}
```

#### 3. ProcessManager

```rust
// src-tauri/src/process.rs

#[tauri::command]
async fn start_runtime(
    runtime_id: String,
    executable_path: String,
    args: Vec<String>,
    working_dir: Option<String>
) -> Result<u32, String>;

#[tauri::command]
async fn stop_runtime(pid: u32) -> Result<(), String>;

#[tauri::command]
async fn restart_runtime(runtime_id: String) -> Result<u32, String>;

#[tauri::command]
async fn send_to_process(pid: u32, input: String) -> Result<(), String>;

#[tauri::command]
async fn get_process_output(pid: u32, lines: Option<usize>) -> Result<Vec<String>, String>;

#[tauri::command]
async fn stream_process_output(pid: u32) -> Result<(), String>;

#[tauri::command]
fn kill_process(pid: u32) -> Result<(), String>;

#[tauri::command]
fn is_process_running(pid: u32) -> Result<bool, String>;
```

#### 4. CLIAdapterRegistry

```rust
// src-tauri/src/cli_adapter.rs

struct CLIAdapter {
    id: String,
    name: String,
    executable: String,
    detect_command: String,
    version_command: String,
    start_command: String,
    stop_command: String,
    config_paths: HashMap<String, String>,
    supported_features: Vec<String>,
}

#[tauri::command]
fn get_available_adapters() -> Vec<CLIAdapter>;

#[tauri::command]
async fn detect_cli_tool(tool_id: String) -> Result<DetectionResult, String>;

#[tauri::command]
async fn run_health_check(tool_id: String) -> Result<HealthCheckResult, String>;

#[tauri::command]
async fn send_message_to_cli(
    tool_id: String,
    message: String,
    context: Option<Vec<String>>
) -> Result<String, String>;

struct DetectionResult {
    installed: bool,
    version: Option<String>,
    path: Option<String>,
    config_found: bool,
}

struct HealthCheckResult {
    healthy: bool,
    version: Option<String>,
    errors: Vec<String>,
    suggestions: Vec<String>,
}
```

#### 5. ConfigManager

```rust
// src-tauri/src/config.rs

#[tauri::command]
async fn scan_config_files(search_paths: Vec<String>) -> Result<Vec<ConfigFileInfo>, String>;

#[tauri::command]
async fn read_config(config_id: String) -> Result<String, String>;

#[tauri::command]
async fn write_config(config_id: String, content: String) -> Result<(), String>;

#[tauri::command]
async fn validate_config(config_id: String, content: String) -> Result<ValidationResult, String>;

#[tauri::command]
async fn create_config_backup(config_id: String) -> Result<String, String>;

#[tauri::command]
async fn restore_config_version(config_id: String, version_id: String) -> Result<(), String>;

#[tauri::command]
async fn get_config_history(config_id: String) -> Result<Vec<ConfigVersion>, String>;

#[tauri::command]
fn get_config_path(config_id: String) -> Result<String, String>;

struct ConfigFileInfo {
    id: String,
    name: String,
    path: String,
    file_type: String, // "env", "yaml", "json", "toml", "modelfile"
    size: u64,
    modified: u64,
}

struct ValidationResult {
    valid: bool,
    errors: Vec<ValidationError>,
}

struct ValidationError {
    line: Option<usize>,
    column: Option<usize>,
    message: String,
    severity: String, // "error", "warning"
}

struct ConfigVersion {
    id: String,
    timestamp: u64,
    description: Option<String>,
    content_hash: String,
}
```

#### 6. MCPService

```rust
// src-tauri/src/mcp.rs

#[tauri::command]
async fn connect_mcp_server(url: String) -> Result<MCPServerInfo, String>;

#[tauri::command]
async fn disconnect_mcp_server(server_id: String) -> Result<(), String>;

#[tauri::command]
async fn discover_mcp_resources(server_id: String) -> Result<Vec<MCPResource>, String>;

#[tauri::command]
async fn discover_mcp_tools(server_id: String) -> Result<Vec<MCPTool>, String>;

#[tauri::command]
async fn invoke_mcp_tool(
    server_id: String,
    tool_id: String,
    parameters: HashMap<String, serde_json::Value>
) -> Result<serde_json::Value, String>;

#[tauri::command]
async fn get_mcp_resource_status(
    server_id: String,
    resource_id: String
) -> Result<ResourceStatus, String>;

struct MCPServerInfo {
    id: String,
    name: String,
    url: String,
    version: String,
    capabilities: Vec<String>,
}

struct MCPResource {
    id: String,
    resource_type: String, // "database", "filesystem", "api", "browser"
    name: String,
    description: String,
    uri: String,
}

struct MCPTool {
    id: String,
    name: String,
    description: String,
    parameters: Vec<ToolParameter>,
}

struct ToolParameter {
    name: String,
    param_type: String,
    description: String,
    required: bool,
}

struct ResourceStatus {
    available: bool,
    last_accessed: Option<u64>,
    error: Option<String>,
}
```

#### 7. SkillsExecutor

```rust
// src-tauri/src/skills.rs

#[tauri::command]
async fn execute_skill(
    skill_id: String,
    parameters: HashMap<String, serde_json::Value>,
    require_approval: bool
) -> Result<SkillExecutionResult, String>;

#[tauri::command]
async fn approve_skill_execution(execution_id: String) -> Result<serde_json::Value, String>;

#[tauri::command]
async fn deny_skill_execution(execution_id: String) -> Result<(), String>;

#[tauri::command]
async fn get_execution_history(skill_id: Option<String>) -> Result<Vec<SkillExecution>, String>;

#[tauri::command]
async fn execute_workflow(
    workflow_id: String,
    inputs: HashMap<String, serde_json::Value>
) -> Result<WorkflowExecutionResult, String>;

// Built-in skills
#[tauri::command]
async fn skill_run_terminal_command(command: String, working_dir: Option<String>) -> Result<CommandOutput, String>;

#[tauri::command]
async fn skill_read_file(path: String) -> Result<String, String>;

#[tauri::command]
async fn skill_write_file(path: String, content: String) -> Result<(), String>;

#[tauri::command]
async fn skill_delete_file(path: String) -> Result<(), String>;

struct SkillExecutionResult {
    execution_id: String,
    status: String, // "pending", "completed", "failed"
    result: Option<serde_json::Value>,
    error: Option<String>,
}

struct SkillExecution {
    id: String,
    skill_id: String,
    timestamp: u64,
    parameters: HashMap<String, serde_json::Value>,
    status: String,
    result: Option<serde_json::Value>,
    error: Option<String>,
}

struct WorkflowExecutionResult {
    success: bool,
    outputs: HashMap<String, serde_json::Value>,
    executed_nodes: Vec<String>,
    failed_node: Option<String>,
    error: Option<String>,
}

struct CommandOutput {
    stdout: String,
    stderr: String,
    exit_code: i32,
}
```

#### 8. DatabaseService

```rust
// src-tauri/src/database.rs

#[tauri::command]
async fn init_database(db_path: String) -> Result<(), String>;

#[tauri::command]
async fn save_session(session: Session) -> Result<(), String>;

#[tauri::command]
async fn load_sessions() -> Result<Vec<Session>, String>;

#[tauri::command]
async fn save_message(message: Message) -> Result<(), String>;

#[tauri::command]
async fn load_messages(session_id: String) -> Result<Vec<Message>, String>;

#[tauri::command]
async fn search_messages(query: String) -> Result<Vec<SearchResult>, String>;

#[tauri::command]
async fn delete_session(session_id: String) -> Result<(), String>;

#[tauri::command]
async fn export_session(session_id: String, format: String) -> Result<String, String>;

struct Session {
    id: String,
    project_id: String,
    runtime_id: String,
    title: String,
    created_at: u64,
    updated_at: u64,
    tags: Option<Vec<String>>,
}

struct Message {
    id: String,
    session_id: String,
    role: String, // "user", "assistant", "system"
    content: String,
    timestamp: u64,
    metadata: Option<String>, // JSON string
}

struct SearchResult {
    session_id: String,
    message_id: String,
    content: String,
    timestamp: u64,
    highlight: String,
}
```

#### 9. SecureStorage

```rust
// src-tauri/src/secure_storage.rs

#[tauri::command]
async fn store_credential(key: String, value: String) -> Result<(), String>;

#[tauri::command]
async fn retrieve_credential(key: String) -> Result<Option<String>, String>;

#[tauri::command]
async fn delete_credential(key: String) -> Result<(), String>;

#[tauri::command]
async fn list_credentials() -> Result<Vec<String>, String>;

// Uses platform-specific secure storage:
// - Windows: Credential Locker
// - macOS: Keychain
// - Linux: Secret Service
```

#### 10. TokenEstimator

```rust
// src-tauri/src/token_estimator.rs

#[tauri::command]
fn estimate_tokens(text: String, model_type: String) -> Result<usize, String>;

#[tauri::command]
fn estimate_tokens_batch(texts: Vec<String>, model_type: String) -> Result<Vec<usize>, String>;

#[tauri::command]
fn get_token_limit(model_type: String) -> Result<usize, String>;

// Uses tiktoken or similar tokenizer library
```

## Data Models

### 持久化数据结构

```typescript
// 存储在 app_data_dir/omniai-studio/

// SQLite Database Schema (conversations.db)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  runtime_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  tags TEXT -- JSON array
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT, -- JSON object
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE VIRTUAL TABLE messages_fts USING fts5(content, content=messages, content_rowid=id);

// Tauri Plugin Store (settings.json)
interface SettingsData {
  version: number;
  theme: string;
  language: string;
  editorFontSize: number;
  autoSave: boolean;
  panelSizes: {
    navigation: number;
    main: number;
    context: number;
  };
  keyboardShortcuts: Record<string, string>;
  tokenLimits: Record<string, number>;
}

// projects.json
interface ProjectsData {
  version: number;
  projects: Project[];
  recentProjects: string[]; // project IDs
}

// runtimes.json
interface RuntimesData {
  version: number;
  customRuntimes: AIRuntime[];
  lastScan: number;
}

// prompts.json
interface PromptsData {
  version: number;
  templates: PromptTemplate[];
  categories: string[];
  abTests: ABTest[];
}

// skills.json
interface SkillsData {
  version: number;
  skills: AgentSkill[];
  workflows: Workflow[];
}

// mcp-servers.json
interface MCPServersData {
  version: number;
  servers: {
    id: string;
    name: string;
    url: string;
    autoConnect: boolean;
  }[];
}

// config-backups/
// ├── {config_id}/
// │   ├── {timestamp}_backup.json
// │   └── metadata.json
```

### 消息格式

```typescript
// AI 流式响应消息
interface StreamMessage {
  type: 'start' | 'chunk' | 'end' | 'error';
  content?: string;
  metadata?: {
    runtimeId: string;
    timestamp: number;
    fileChanges?: FileChange[];
    skillExecutions?: SkillExecution[];
    tokenCount?: number;
  };
}

// 文件变更
interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  diff?: string;
  newContent?: string;
  approved?: boolean;
}

// MCP 工具调用
interface MCPToolCall {
  serverId: string;
  toolId: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// Agent Skill 执行
interface SkillExecution {
  id: string;
  skillId: string;
  timestamp: number;
  parameters: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

// 系统通知（用于 Skill 审批）
interface SystemNotification {
  id: string;
  type: 'skill_approval' | 'runtime_error' | 'update_available';
  title: string;
  message: string;
  actions?: NotificationAction[];
  timestamp: number;
}

interface NotificationAction {
  label: string;
  action: 'approve' | 'deny' | 'view' | 'dismiss';
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Runtime Detection Completeness

*For any* system PATH containing AI tool executables (ollama, python, node, docker), the runtime scanner SHALL detect all present tools and return their executable paths and versions.

**Validates: Requirements 1.2, 1.7**

### Property 2: Runtime Status Consistency

*For any* AI runtime, the displayed status (running, stopped, not installed, error) SHALL accurately reflect the actual process state at all times.

**Validates: Requirements 2.1, 2.5**

### Property 3: Runtime Control Commands

*For any* AI runtime, executing a start command SHALL result in a running process, and executing a stop command on a running process SHALL terminate it.

**Validates: Requirements 3.1**

### Property 4: Process Output Capture Completeness

*For any* spawned AI runtime process, all stdout and stderr output SHALL be captured and available for retrieval.

**Validates: Requirements 3.6**

### Property 5: Path Validation Correctness

*For any* file path string (absolute or relative), the path validation function SHALL correctly determine if the path exists, is accessible, and is a directory, returning appropriate error messages for invalid paths.

**Validates: Requirements 4.1**

### Property 6: File Tree Completeness

*For any* valid directory path, scanning the directory SHALL produce a file tree that contains all files and subdirectories present in the original directory, with correct parent-child relationships.

**Validates: Requirements 4.3**

### Property 7: Gitignore Filtering Correctness

*For any* project with .gitignore rules, the file tree SHALL exclude all files and directories matching the gitignore patterns.

**Validates: Requirements 4.4**

### Property 8: Token Estimation Accuracy

*For any* set of selected files, the token estimator SHALL calculate a token count that accurately represents the total tokens required to encode all file contents for the target model.

**Validates: Requirements 5.3**

### Property 9: Token Limit Enforcement

*For any* context selection, when the total token count exceeds the model's limit, the system SHALL prevent sending the message and display a warning.

**Validates: Requirements 5.7**

### Property 10: File Change Application

*For any* approved file change (create, modify, delete), applying the change SHALL result in the file system reflecting the exact proposed modification.

**Validates: Requirements 6.6**

### Property 11: Config File Discovery

*For any* directory containing configuration files (.env, .yaml, .json, .toml, modelfile), the config scanner SHALL discover all configuration files and return their paths and types.

**Validates: Requirements 7.1**

### Property 12: Config Backup Before Save

*For any* configuration file save operation, a backup snapshot SHALL be created before the new content is written to disk.

**Validates: Requirements 7.7**

### Property 13: Config Rollback Round-Trip

*For any* configuration file, saving a change then rolling back to a previous version SHALL restore the exact content from that version.

**Validates: Requirements 7.9**

### Property 14: Parameter Update Reactivity

*For any* model parameter slider adjustment, the corresponding parameter value SHALL update immediately to reflect the slider position.

**Validates: Requirements 8.2**

### Property 15: Session ID Uniqueness

*For any* sequence of session creation operations, all created sessions SHALL have unique IDs with no duplicates.

**Validates: Requirements 9.2**

### Property 16: Session History Loading

*For any* session switch operation, the loaded conversation history SHALL contain exactly the messages associated with that session in chronological order.

**Validates: Requirements 9.3**

### Property 17: Message Persistence

*For any* message added to a conversation, the message SHALL be persisted to the SQLite database and retrievable in subsequent queries.

**Validates: Requirements 10.1**

### Property 18: Session Data Round-Trip Persistence

*For any* valid session with conversations and messages, persisting to database and then loading SHALL produce an equivalent session object with all messages preserved in order.

**Validates: Requirements 10.2**

### Property 19: Full-Text Search Completeness

*For any* search query, the search function SHALL return all messages containing the query text, and SHALL NOT return messages that don't contain the query.

**Validates: Requirements 10.5**

### Property 20: Markdown Rendering Correctness

*For any* valid GitHub Flavored Markdown string, the renderer SHALL produce HTML that correctly represents all markdown elements (headers, lists, links, code blocks, tables).

**Validates: Requirements 11.1**

### Property 21: Code Block Detection

*For any* markdown string with code blocks, the parser SHALL identify all code blocks with their language annotations, preserving the code content exactly.

**Validates: Requirements 11.2**

### Property 22: Conversation Export Completeness

*For any* conversation, exporting to Markdown SHALL produce a document containing all messages with timestamps, roles, and formatted content.

**Validates: Requirements 12.3**

### Property 23: Template Variable Interpolation

*For any* prompt template with variables {{var1}}, {{var2}}, etc., and a mapping of variable names to values, interpolation SHALL replace all variable placeholders with their corresponding values.

**Validates: Requirements 13.4**

### Property 24: Template Persistence Round-Trip

*For any* custom prompt template, saving to storage and then loading SHALL produce an equivalent template object with all fields preserved.

**Validates: Requirements 13.7**

### Property 25: Prompt Enhancement Expansion

*For any* brief task description, the Magic Enhance function SHALL produce an enhanced prompt that is longer than the input and contains the original description's key concepts.

**Validates: Requirements 14.2**

### Property 26: A/B Test Variant Execution

*For any* A/B test with N variants, running the test SHALL send all N variants to the AI tool and collect N responses.

**Validates: Requirements 15.3**

### Property 27: MCP Resource Discovery

*For any* connected MCP server, the resource discovery function SHALL return all resources and tools advertised by that server.

**Validates: Requirements 16.4, 17.7**

### Property 28: Skill Signature Validation

*For any* skill registration attempt, the validator SHALL accept only skills with valid function signatures (name, parameters with types, return type) and reject invalid signatures with specific error messages.

**Validates: Requirements 18.4**

### Property 29: Skill Persistence Round-Trip

*For any* registered Agent Skill, persisting to storage and then loading SHALL produce an equivalent skill object with all properties preserved.

**Validates: Requirements 18.5**

### Property 30: Sensitive Skill Classification

*For any* skill with name matching "delete_file", "run_terminal_command", or "write_file", the skill SHALL be marked as requiring approval (requiresApproval = true).

**Validates: Requirements 19.2**

### Property 31: Approved Skill Execution

*For any* approved skill execution, the skill SHALL execute with the provided parameters and return a result or error.

**Validates: Requirements 19.5**

### Property 32: Skill Execution Logging

*For any* skill execution (approved or denied), an execution record SHALL be created with timestamp, parameters, status, and result/error.

**Validates: Requirements 19.7**

### Property 33: Workflow Node Type Validation

*For any* workflow edge connecting two nodes, if the source node outputs type T and the target node expects input type U, the connection SHALL be valid only if T is compatible with U.

**Validates: Requirements 20.3**

### Property 34: Workflow Execution Order

*For any* workflow with nodes connected in a specific order, executing the workflow SHALL run skills in the order defined by the edges, respecting dependencies.

**Validates: Requirements 20.6**

### Property 35: Panel Size Persistence

*For any* panel resize operation, the new panel sizes SHALL be persisted and restored when the application restarts.

**Validates: Requirements 21.5**

### Property 36: Theme Preference Persistence

*For any* theme setting (light, dark, system), saving the preference and reloading SHALL restore the same theme setting.

**Validates: Requirements 22.4**

### Property 37: Secure Credential Storage

*For any* API key or credential, storing it SHALL use platform-specific secure storage (Windows Credential Locker, macOS Keychain, Linux Secret Service), and the credential SHALL be retrievable only by the application.

**Validates: Requirements 24.2**

### Property 38: Export Data Sanitization

*For any* data export operation, the exported data SHALL NOT contain any API keys, credentials, or sensitive authentication tokens.

**Validates: Requirements 24.7**

### Property 39: Cross-Platform Path Handling

*For any* file path string, the path normalization function SHALL produce a valid path for the current platform, handling both forward and backward slashes correctly.

**Validates: Requirements 25.3**

### Property 40: Update Signature Verification

*For any* application update package, the system SHALL verify the cryptographic signature before installation, and SHALL reject packages with invalid or missing signatures.

**Validates: Requirements 26.5**

### Property 41: Error Message Generation

*For any* error condition, the error handler SHALL produce a user-friendly error message containing the error type, description, and at least one suggested action.

**Validates: Requirements 28.1**

### Property 42: Crash State Preservation

*For any* critical error that causes application termination, the system SHALL save the current application state (open sessions, unsaved changes) before exiting.

**Validates: Requirements 28.4**

### Property 43: Backup and Restore Round-Trip

*For any* application state (sessions, settings, configurations), creating a backup and then restoring from it SHALL produce an equivalent application state.

**Validates: Requirements 29.6**

### Property 44: Plugin Hot-Loading

*For any* valid plugin, installing the plugin SHALL make it available for use without requiring application restart.

**Validates: Requirements 30.4**

### Property 45: Plugin Validation

*For any* plugin manifest, the validation function SHALL accept only plugins with valid structure, compatible version requirements, and valid security permissions, rejecting all others with specific error messages.

**Validates: Requirements 30.5**

## Error Handling

### Frontend Error Handling

1. **网络/IPC 错误**: 所有 Tauri 命令调用使用 try-catch 包装，显示用户友好的错误提示
2. **状态错误**: Pinia store 操作失败时回滚状态，记录错误日志
3. **渲染错误**: Vue 错误边界组件捕获渲染错误，显示降级 UI
4. **AI 运行时错误**: 捕获进程崩溃、连接失败，提供重启和诊断选项
5. **文件系统错误**: 处理权限拒绝、文件不存在、磁盘空间不足等情况
6. **MCP 连接错误**: 处理服务器不可达、超时、协议错误，自动重连

```typescript
// src/utils/errorHandler.ts
interface AppError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
  suggestedActions?: string[];
}

function handleError(error: AppError): void {
  if (error.recoverable) {
    showNotification({ 
      type: 'error', 
      message: error.message,
      actions: error.suggestedActions 
    });
  } else {
    showErrorDialog({ 
      title: 'Critical Error', 
      message: error.message,
      details: error.details 
    });
    saveApplicationState(); // 保存状态以便恢复
  }
  logError(error);
}

// 错误恢复策略
interface RecoveryStrategy {
  retry: () => Promise<void>;
  fallback: () => Promise<void>;
  abort: () => void;
}
```

### Backend Error Handling

1. **文件系统错误**: 返回具体错误类型（权限、不存在、IO 错误）
2. **进程错误**: 捕获进程崩溃，清理资源，通知前端
3. **配置错误**: 验证失败返回详细错误位置和建议
4. **运行时错误**: 处理 AI 服务启动失败、端口占用、资源不足
5. **数据库错误**: 处理连接失败、查询错误、事务回滚
6. **安全错误**: 处理权限不足、签名验证失败、恶意插件

```rust
// src-tauri/src/error.rs
#[derive(Debug, Serialize)]
pub enum AppError {
    FileNotFound(String),
    PermissionDenied(String),
    ProcessError { pid: u32, message: String },
    ConfigInvalid { path: String, errors: Vec<String> },
    RuntimeNotInstalled(String),
    RuntimeStartFailed { runtime_id: String, reason: String },
    DatabaseError(String),
    MCPConnectionFailed { server_url: String, reason: String },
    SkillExecutionFailed { skill_id: String, error: String },
    SecurityViolation { action: String, reason: String },
}

impl AppError {
    pub fn to_user_message(&self) -> String {
        match self {
            AppError::RuntimeStartFailed { runtime_id, reason } => {
                format!("Failed to start {}: {}. Try checking if the port is already in use.", runtime_id, reason)
            }
            // ... 其他错误类型的用户友好消息
        }
    }
    
    pub fn suggested_actions(&self) -> Vec<String> {
        match self {
            AppError::RuntimeNotInstalled(name) => {
                vec![
                    format!("Install {} using your package manager", name),
                    "Add custom runtime path manually".to_string(),
                ]
            }
            // ... 其他错误类型的建议操作
        }
    }
}
```

## Testing Strategy

### 单元测试

- **前端**: 使用 Vitest 测试 Vue 组件和 Pinia stores
  - 组件渲染测试
  - Store 状态管理测试
  - 工具函数测试（token 估算、路径处理、模板插值）
- **后端**: 使用 Rust 内置测试框架测试 Tauri 命令
  - 文件系统操作测试
  - 进程管理测试
  - 配置验证测试
  - 数据库操作测试

### 属性测试

属性测试用于验证通用正确性属性，每个测试运行最少 100 次迭代。

- **前端**: 使用 fast-check 进行属性测试
- **后端**: 使用 proptest 进行 Rust 属性测试

```typescript
// 前端属性测试示例
import fc from 'fast-check';

// Property 18: Session Data Round-Trip Persistence
test('Feature: ai-tool-manager, Property 18: Session data persists correctly', () => {
  fc.assert(
    fc.property(
      fc.record({
        id: fc.uuid(),
        projectId: fc.uuid(),
        runtimeId: fc.uuid(),
        title: fc.string(),
        messages: fc.array(fc.record({
          role: fc.constantFrom('user', 'assistant', 'system'),
          content: fc.string(),
          timestamp: fc.integer({ min: 0 })
        }))
      }), 
      async (session) => {
        await sessionStore.saveSession(session);
        const loaded = await sessionStore.loadSession(session.id);
        return deepEqual(session, loaded);
      }
    ),
    { numRuns: 100 }
  );
});

// Property 23: Template Variable Interpolation
test('Feature: ai-tool-manager, Property 23: Template variables interpolate correctly', () => {
  fc.assert(
    fc.property(
      fc.string(),
      fc.dictionary(fc.string(), fc.string()),
      (template, variables) => {
        const result = interpolateTemplate(template, variables);
        // 验证所有变量都被替换
        for (const [key, value] of Object.entries(variables)) {
          if (template.includes(`{{${key}}}`)) {
            expect(result).toContain(value);
            expect(result).not.toContain(`{{${key}}}`);
          }
        }
        return true;
      }
    ),
    { numRuns: 100 }
  );
});
```

```rust
// 后端属性测试示例
use proptest::prelude::*;

// Property 39: Cross-Platform Path Handling
proptest! {
    #[test]
    fn path_normalization_handles_all_separators(path in "[a-z/\\\\]+") {
        let normalized = normalize_path(&path);
        assert!(normalized.is_valid());
        assert!(!normalized.contains("\\\\") && !normalized.contains("//"));
    }
    
    // Property 5: Path Validation Correctness
    #[test]
    fn path_validation_is_consistent(path in ".*") {
        let result = validate_path(&path);
        if result.exists {
            assert!(std::path::Path::new(&path).exists());
        }
        if result.is_directory {
            assert!(std::path::Path::new(&path).is_dir());
        }
    }
}
```

### 集成测试

- 测试 Tauri IPC 通信（前端调用后端命令）
- 测试文件系统操作（读写、监听变化）
- 测试进程管理（启动、停止、日志捕获）
- 测试数据库操作（SQLite 读写、全文搜索）
- 测试 MCP 协议通信
- 测试 Agent Skills 执行流程

### 端到端测试

- 使用 Playwright 或 Tauri 的 WebDriver 进行 E2E 测试
- 测试完整用户工作流：
  - 打开项目 → 选择文件 → 发送消息 → 查看响应
  - 创建提示词模板 → 使用模板 → 导出对话
  - 注册 Agent Skill → AI 调用 → 审批 → 执行
  - 连接 MCP 服务器 → 发现资源 → 调用工具

### 性能测试

- 启动时间测试（目标 < 1 秒）
- 大型项目文件树加载测试（10,000+ 文件）
- Token 估算性能测试
- 数据库查询性能测试（全文搜索）
- 内存使用监控

### 测试配置

- 属性测试最少运行 100 次迭代
- 每个属性测试标注对应的设计文档属性编号
- 使用 GitHub Actions 进行 CI/CD 自动化测试
- 跨平台测试矩阵：Windows, macOS, Linux
