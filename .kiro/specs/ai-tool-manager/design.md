# Design Document: AI Tool Manager

## Overview

AI Tool Manager 是一个基于 Tauri + Vue3 + TypeScript + Pinia 的跨平台桌面应用，用于统一管理和协调多种 AI CLI 工具。应用采用前后端分离架构，前端使用 Vue3 构建响应式 UI，后端使用 Rust 处理系统级操作（进程管理、文件系统访问）。

### 技术栈

- **前端**: Vue 3 + TypeScript + Pinia + Vue Router
- **UI 组件**: 自定义组件 + Tailwind CSS
- **Markdown 渲染**: markdown-it + highlight.js
- **后端**: Tauri (Rust)
- **数据存储**: JSON 文件 (通过 Tauri fs API)
- **进程管理**: Tauri shell API

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Tool Manager                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Vue 3 Frontend                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │   │
│  │  │ Project  │  │Conversa- │  │  Prompt  │  │ Settings│  │   │
│  │  │  View    │  │tion View │  │Generator │  │  View   │  │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │   │
│  │       │              │             │             │       │   │
│  │  ┌────┴──────────────┴─────────────┴─────────────┴────┐  │   │
│  │  │                  Pinia Stores                       │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │  │   │
│  │  │  │Project  │ │Session  │ │ToolState│ │ Settings │  │  │   │
│  │  │  │Store    │ │Store    │ │Store    │ │ Store    │  │  │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └──────────┘  │  │   │
│  │  └────────────────────┬───────────────────────────────┘  │   │
│  └───────────────────────┼──────────────────────────────────┘   │
│                          │ Tauri IPC                            │
│  ┌───────────────────────┼──────────────────────────────────┐   │
│  │                 Tauri Backend (Rust)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │ FileSystem  │  │   Process   │  │   CLI Adapter   │   │   │
│  │  │  Service    │  │   Manager   │  │    Registry     │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │    MCP      │  │   Config    │  │   Health        │   │   │
│  │  │  Service    │  │   Manager   │  │   Checker       │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 层次结构

1. **表现层 (Vue Components)**: 负责 UI 渲染和用户交互
2. **状态层 (Pinia Stores)**: 管理应用状态，处理业务逻辑
3. **服务层 (Tauri Commands)**: 通过 IPC 调用 Rust 后端服务
4. **系统层 (Rust Backend)**: 处理文件系统、进程管理、CLI 交互

## Components and Interfaces

### Frontend Components

#### 1. ProjectView 组件

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
}
```

#### 2. ConversationView 组件

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
}
```

#### 3. PromptGenerator 组件

```typescript
// src/components/PromptGenerator.vue
interface PromptTemplate {
  id: string;
  name: string;
  modelType: string;
  template: string;
  variables: string[];
}

interface GeneratedPrompt {
  content: string;
  modelType: string;
  context: Record<string, string>;
}
```

#### 4. ToolConfigEditor 组件

```typescript
// src/components/ToolConfigEditor.vue
interface ToolConfig {
  toolId: string;
  configPath: string;
  content: string;
  schema?: object;
}
```

### Pinia Stores

#### 1. ProjectStore

```typescript
// src/stores/project.ts
interface ProjectState {
  currentProject: Project | null;
  recentProjects: Project[];
  fileTree: FileTreeNode | null;
  selectedFile: string | null;
}

interface Project {
  id: string;
  name: string;
  path: string;
  lastOpened: number;
  aiToolsUsed: string[];
}

interface ProjectActions {
  openProject(path: string): Promise<void>;
  closeProject(): void;
  refreshFileTree(): Promise<void>;
  selectFile(path: string): Promise<string>;
  addToRecent(project: Project): void;
}
```

#### 2. SessionStore

```typescript
// src/stores/session.ts
interface SessionState {
  sessions: Map<string, Session>;
  currentSessionId: string | null;
  conversations: Map<string, Conversation>;
}

interface Session {
  id: string;
  projectId: string;
  toolId: string;
  createdAt: number;
  updatedAt: number;
  title: string;
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
  metadata?: Record<string, unknown>;
}

interface SessionActions {
  createSession(projectId: string, toolId: string): Session;
  loadSessions(): Promise<void>;
  saveSessions(): Promise<void>;
  addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Message;
  searchSessions(query: string): Session[];
  deleteSession(sessionId: string): void;
  exportSession(sessionId: string): Promise<string>;
}
```

#### 3. ToolStateStore

```typescript
// src/stores/toolState.ts
interface ToolStateState {
  availableTools: AITool[];
  installedTools: Map<string, InstalledTool>;
  activeToolId: string | null;
  toolProcesses: Map<string, ToolProcess>;
}

interface AITool {
  id: string;
  name: string;
  description: string;
  installCommand: Record<string, string>; // platform -> command
  configPath: Record<string, string>; // platform -> path
  healthCheckCommand: string;
}

interface InstalledTool {
  toolId: string;
  version: string;
  configPath: string;
  status: 'ready' | 'not_configured' | 'error';
  lastChecked: number;
}

interface ToolProcess {
  toolId: string;
  pid: number;
  status: 'running' | 'stopped' | 'error';
}

interface ToolStateActions {
  detectInstalledTools(): Promise<void>;
  checkToolHealth(toolId: string): Promise<HealthCheckResult>;
  installTool(toolId: string): Promise<void>;
  getToolConfig(toolId: string): Promise<string>;
  saveToolConfig(toolId: string, content: string): Promise<void>;
  startToolProcess(toolId: string, projectPath: string): Promise<void>;
  stopToolProcess(toolId: string): Promise<void>;
  sendMessage(toolId: string, message: string): Promise<void>;
}

interface HealthCheckResult {
  toolId: string;
  status: 'healthy' | 'unhealthy';
  version?: string;
  errors?: string[];
  suggestions?: string[];
}
```

#### 4. SettingsStore

```typescript
// src/stores/settings.ts
interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  language: string;
  editorFontSize: number;
  autoSave: boolean;
  promptTemplates: PromptTemplate[];
}

interface SettingsActions {
  loadSettings(): Promise<void>;
  saveSettings(): Promise<void>;
  setTheme(theme: 'light' | 'dark' | 'system'): void;
  addPromptTemplate(template: PromptTemplate): void;
  removePromptTemplate(id: string): void;
}
```

### Tauri Backend Services

#### 1. FileSystemService

```rust
// src-tauri/src/filesystem.rs

#[tauri::command]
async fn read_directory(path: String) -> Result<Vec<FileEntry>, String>;

#[tauri::command]
async fn read_file(path: String) -> Result<String, String>;

#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String>;

#[tauri::command]
async fn watch_file(path: String) -> Result<(), String>;

struct FileEntry {
    name: String,
    path: String,
    is_directory: bool,
    size: u64,
    modified: u64,
}
```

#### 2. ProcessManager

```rust
// src-tauri/src/process.rs

#[tauri::command]
async fn spawn_cli_process(
    tool_id: String,
    working_dir: String,
    args: Vec<String>
) -> Result<u32, String>;

#[tauri::command]
async fn send_to_process(pid: u32, input: String) -> Result<(), String>;

#[tauri::command]
async fn kill_process(pid: u32) -> Result<(), String>;

#[tauri::command]
fn get_process_output(pid: u32) -> Result<String, String>;
```

#### 3. CLIAdapterRegistry

```rust
// src-tauri/src/cli_adapter.rs

struct CLIAdapter {
    id: String,
    name: String,
    executable: String,
    detect_command: String,
    version_command: String,
    config_paths: HashMap<String, String>,
}

#[tauri::command]
fn get_available_adapters() -> Vec<CLIAdapter>;

#[tauri::command]
async fn detect_cli_tool(tool_id: String) -> Result<DetectionResult, String>;

#[tauri::command]
async fn run_health_check(tool_id: String) -> Result<HealthCheckResult, String>;

struct DetectionResult {
    installed: bool,
    version: Option<String>,
    path: Option<String>,
}
```

#### 4. ConfigManager

```rust
// src-tauri/src/config.rs

#[tauri::command]
async fn read_tool_config(tool_id: String) -> Result<String, String>;

#[tauri::command]
async fn write_tool_config(tool_id: String, content: String) -> Result<(), String>;

#[tauri::command]
async fn validate_config(tool_id: String, content: String) -> Result<ValidationResult, String>;

#[tauri::command]
fn get_config_path(tool_id: String) -> Result<String, String>;

struct ValidationResult {
    valid: bool,
    errors: Vec<String>,
}
```

#### 5. MCPService

```rust
// src-tauri/src/mcp.rs

#[tauri::command]
async fn create_mcp_session(tools: Vec<String>) -> Result<String, String>;

#[tauri::command]
async fn distribute_task(
    session_id: String,
    task: String,
    tool_assignments: HashMap<String, String>
) -> Result<TaskResult, String>;

#[tauri::command]
async fn get_mcp_status(session_id: String) -> Result<MCPStatus, String>;

struct TaskResult {
    tool_id: String,
    status: String,
    output: String,
}

struct MCPStatus {
    session_id: String,
    active_tools: Vec<String>,
    pending_tasks: u32,
}
```

## Data Models

### 持久化数据结构

```typescript
// 存储在 app_data_dir/ai-tool-manager/

// projects.json
interface ProjectsData {
  version: number;
  projects: Project[];
}

// sessions.json
interface SessionsData {
  version: number;
  sessions: Session[];
  conversations: Record<string, Conversation>;
}

// settings.json
interface SettingsData {
  version: number;
  theme: string;
  language: string;
  editorFontSize: number;
  autoSave: boolean;
  promptTemplates: PromptTemplate[];
}

// tool-configs/
// ├── codex.json
// ├── claude-code.json
// └── google-cli.json
```

### 消息格式

```typescript
interface StreamMessage {
  type: 'start' | 'chunk' | 'end' | 'error';
  content?: string;
  metadata?: {
    toolId: string;
    timestamp: number;
    fileChanges?: FileChange[];
  };
}

interface FileChange {
  path: string;
  type: 'create' | 'modify' | 'delete';
  diff?: string;
  newContent?: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Project File Tree Completeness

*For any* valid directory path, scanning the directory SHALL produce a file tree that contains all files and subdirectories present in the original directory, with correct parent-child relationships.

**Validates: Requirements 1.1**

### Property 2: Recent Projects List Invariant

*For any* sequence of project open operations, the recent projects list SHALL contain at most N entries (configurable max), with the most recently opened project at the front, and no duplicate entries.

**Validates: Requirements 1.4**

### Property 3: Session Data Round-Trip Persistence

*For any* valid session with conversations and messages, serializing to JSON and then deserializing SHALL produce an equivalent session object with all messages preserved in order.

**Validates: Requirements 1.5, 5.1, 5.2, 9.1, 9.2**

### Property 4: Tool Detection Status Mapping

*For any* tool detection result (installed/not installed/version info), the status mapping function SHALL produce a consistent status value (ready/not_configured/error) based on the detection data.

**Validates: Requirements 2.4**

### Property 5: Configuration Validation Consistency

*For any* configuration content string, the validation function SHALL return valid=true only if the content conforms to the expected schema, and SHALL return specific error messages for invalid content.

**Validates: Requirements 2.6**

### Property 6: Configuration Import/Export Round-Trip

*For any* valid tool configuration, exporting to a file and then importing from that file SHALL produce an equivalent configuration object.

**Validates: Requirements 2.7**

### Property 7: Health Check Error Handling

*For any* health check failure, the system SHALL produce an error message containing the failure reason and at least one actionable suggestion for remediation.

**Validates: Requirements 3.3, 3.5**

### Property 8: File Change Diff Generation

*For any* pair of file contents (original and modified), the diff generation function SHALL produce a diff that, when applied to the original, produces the modified content.

**Validates: Requirements 4.4**

### Property 9: Context Preservation on Tool Switch

*For any* active session with messages, switching to a different AI tool and back SHALL preserve all conversation messages and their order.

**Validates: Requirements 4.6**

### Property 10: Session Grouping Correctness

*For any* collection of sessions with different project IDs, grouping by project SHALL produce groups where all sessions in each group have the same project ID, and no session appears in multiple groups.

**Validates: Requirements 5.3**

### Property 11: Session Search Filtering

*For any* search query and session collection, the search function SHALL return only sessions where the query matches the project name, tool type, or message content, and SHALL return all matching sessions.

**Validates: Requirements 5.4**

### Property 12: Session Deletion Completeness

*For any* session deletion operation, the deleted session and all its associated conversations SHALL no longer be retrievable from storage.

**Validates: Requirements 5.5**

### Property 13: Session Export to Markdown

*For any* session with messages, the exported Markdown SHALL contain all message contents, timestamps, and role indicators in a readable format.

**Validates: Requirements 5.6**

### Property 14: MCP Task Distribution

*For any* coordinated task with tool assignments, the MCP service SHALL distribute each subtask to exactly one assigned tool, with no subtask left unassigned.

**Validates: Requirements 6.2**

### Property 15: MCP Result Aggregation

*For any* set of completed subtask results from multiple tools, the aggregation function SHALL combine all results into a unified view containing all individual outputs.

**Validates: Requirements 6.3, 6.4**

### Property 16: MCP Error Handling

*For any* tool failure during coordination, the MCP service SHALL capture the error, mark the subtask as failed, and continue processing other subtasks without crashing.

**Validates: Requirements 6.6**

### Property 17: Prompt Generation with Context

*For any* task description and project context, the generated prompt SHALL contain the task description and relevant project information, formatted according to the target model's conventions.

**Validates: Requirements 7.2, 7.3**

### Property 18: Prompt Template Persistence

*For any* saved prompt template, retrieving the template by ID SHALL return an equivalent template object with all fields preserved.

**Validates: Requirements 7.4**

### Property 19: Markdown Parsing Correctness

*For any* valid Markdown string with code blocks, the parser SHALL identify all code blocks and their language annotations, preserving the code content exactly.

**Validates: Requirements 8.1, 8.4**

### Property 20: Backup/Restore Round-Trip

*For any* application state (sessions, settings, configurations), creating a backup and then restoring from it SHALL produce an equivalent application state.

**Validates: Requirements 9.5**

### Property 21: Cross-Platform Path Handling

*For any* file path string, the path normalization function SHALL produce a valid path for the current platform, handling both forward and backward slashes correctly.

**Validates: Requirements 10.2**

### Property 22: Theme Preference Persistence

*For any* theme setting (light/dark/system), saving the preference and reloading SHALL restore the same theme setting.

**Validates: Requirements 11.4**

### Property 23: Plugin Validation

*For any* plugin manifest, the validation function SHALL accept only plugins with valid structure and compatible version requirements, rejecting all others with specific error messages.

**Validates: Requirements 12.4**

## Error Handling

### Frontend Error Handling

1. **网络/IPC 错误**: 所有 Tauri 命令调用使用 try-catch 包装，显示用户友好的错误提示
2. **状态错误**: Pinia store 操作失败时回滚状态，记录错误日志
3. **渲染错误**: Vue 错误边界组件捕获渲染错误，显示降级 UI

```typescript
// src/utils/errorHandler.ts
interface AppError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

function handleError(error: AppError): void {
  if (error.recoverable) {
    showNotification({ type: 'error', message: error.message });
  } else {
    showErrorDialog({ title: 'Error', message: error.message });
  }
  logError(error);
}
```

### Backend Error Handling

1. **文件系统错误**: 返回具体错误类型（权限、不存在、IO 错误）
2. **进程错误**: 捕获进程崩溃，清理资源，通知前端
3. **配置错误**: 验证失败返回详细错误位置和建议

```rust
// src-tauri/src/error.rs
#[derive(Debug, Serialize)]
pub enum AppError {
    FileNotFound(String),
    PermissionDenied(String),
    ProcessError { pid: u32, message: String },
    ConfigInvalid { path: String, errors: Vec<String> },
    ToolNotInstalled(String),
}
```

## Testing Strategy

### 单元测试

- **前端**: 使用 Vitest 测试 Vue 组件和 Pinia stores
- **后端**: 使用 Rust 内置测试框架测试 Tauri 命令

### 属性测试

- **前端**: 使用 fast-check 进行属性测试
- **后端**: 使用 proptest 进行 Rust 属性测试

```typescript
// 前端属性测试示例
import fc from 'fast-check';

// Property 3: Session Data Round-Trip
fc.assert(
  fc.property(fc.record({
    id: fc.uuid(),
    projectId: fc.uuid(),
    messages: fc.array(fc.record({
      role: fc.constantFrom('user', 'assistant'),
      content: fc.string(),
      timestamp: fc.integer()
    }))
  }), (session) => {
    const serialized = JSON.stringify(session);
    const deserialized = JSON.parse(serialized);
    return deepEqual(session, deserialized);
  })
);
```

```rust
// 后端属性测试示例
use proptest::prelude::*;

// Property 21: Cross-Platform Path Handling
proptest! {
    #[test]
    fn path_normalization_handles_all_separators(path in "[a-z/\\\\]+") {
        let normalized = normalize_path(&path);
        assert!(normalized.is_valid());
    }
}
```

### 集成测试

- 测试 Tauri IPC 通信
- 测试文件系统操作
- 测试进程管理

### 测试配置

- 属性测试最少运行 100 次迭代
- 每个属性测试标注对应的设计文档属性编号
