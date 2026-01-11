# Requirements Document

## Introduction

AI Tool Manager 是一个跨平台桌面应用程序，作为多 AI 编程助手的统一管理和协调平台。用户可以通过该工具打开项目，使用不同的 AI CLI 工具（Codex、Google CLI、Claude Code 等）以对话方式完成项目改造。应用解决了终端关闭后对话难以查找的问题，提供界面化的 AI 工具切换、MCP 集成、多 AI 协调、以及针对不同模型的提示词生成功能。使用 Vue3 + TypeScript + Pinia + Tauri 技术栈构建。

## Glossary

- **AI_Tool_Manager**: 主应用程序，负责项目管理、AI 工具协调和对话管理
- **Project**: 用户打开的本地项目目录，作为 AI 工具的工作上下文
- **Session**: 在特定项目中与 AI 工具的一次工作会话
- **Conversation**: 会话中的对话记录，包含多条消息
- **Message**: 对话中的单条消息，包含角色（用户/AI）和内容
- **AI_CLI_Adapter**: 适配不同 AI CLI 工具（Codex/Google CLI/Claude Code）的模块
- **MCP_Service**: Model Context Protocol 服务，用于协调多 AI 工具
- **Prompt_Generator**: 根据不同模型特性生成优化提示词的模块
- **Markdown_Renderer**: 负责解析和渲染 Markdown 内容的组件
- **Session_Store**: 使用 Pinia 管理的会话状态存储
- **File_System_Service**: 通过 Tauri 访问本地文件系统的服务

## Requirements

### Requirement 1: 项目管理

**User Story:** As a developer, I want to open and manage local projects, so that I can use AI tools within the context of my codebase.

#### Acceptance Criteria

1. WHEN a user opens a project directory, THE AI_Tool_Manager SHALL scan and index the project structure
2. WHEN a project is opened, THE AI_Tool_Manager SHALL display the project file tree in a sidebar
3. WHEN a user selects a file from the project tree, THE AI_Tool_Manager SHALL display its content with syntax highlighting
4. THE AI_Tool_Manager SHALL maintain a list of recently opened projects for quick access
5. WHEN a project is opened, THE Session_Store SHALL create or restore the associated session data

### Requirement 2: AI CLI 工具安装与配置

**User Story:** As a developer, I want to install and configure AI CLI tools from within the application, so that I can quickly set up my AI development environment.

#### Acceptance Criteria

1. THE AI_Tool_Manager SHALL provide installation guides and scripts for mainstream AI CLI tools (Codex, Google CLI, Claude Code, etc.)
2. WHEN a user initiates AI tool installation, THE AI_Tool_Manager SHALL execute the appropriate installation commands for the current platform
3. THE AI_Tool_Manager SHALL detect installed AI CLI tools and their versions on the system
4. WHEN an AI CLI tool is detected, THE AI_Tool_Manager SHALL display its status (installed/not installed/outdated)
5. THE AI_Tool_Manager SHALL provide a configuration editor for each AI CLI tool's config files
6. WHEN editing configuration, THE AI_Tool_Manager SHALL validate the config format before saving
7. THE AI_Tool_Manager SHALL support importing and exporting AI tool configurations

### Requirement 3: AI CLI 工具状态检测

**User Story:** As a developer, I want to check the status of my AI CLI tools, so that I can ensure they are properly configured and ready to use.

#### Acceptance Criteria

1. WHEN the application starts, THE AI_Tool_Manager SHALL scan for installed AI CLI tools
2. THE AI_Tool_Manager SHALL verify each AI CLI tool's authentication status (API keys, tokens)
3. WHEN an AI CLI tool is not properly configured, THE AI_Tool_Manager SHALL display a warning with remediation steps
4. THE AI_Tool_Manager SHALL provide a health check function to test AI CLI tool connectivity
5. WHEN a health check fails, THE AI_Tool_Manager SHALL display the error details and suggest fixes
6. THE AI_Tool_Manager SHALL periodically check AI CLI tool status and notify users of issues

### Requirement 4: AI CLI 工具交互

**User Story:** As a developer, I want to interact with multiple AI CLI tools through a unified interface, so that I can leverage different AI capabilities without switching terminals.

#### Acceptance Criteria

1. THE AI_CLI_Adapter SHALL support integration with Codex CLI, Google CLI, and Claude Code
2. WHEN a user selects an AI tool, THE AI_Tool_Manager SHALL establish a connection to the corresponding CLI process
3. WHEN a user sends a message, THE AI_CLI_Adapter SHALL forward it to the active AI tool and stream the response
4. WHEN an AI tool generates file changes, THE AI_Tool_Manager SHALL display a diff view before applying
5. THE AI_CLI_Adapter SHALL support extensible plugin architecture for adding new AI CLI tools
6. WHEN switching between AI tools, THE AI_Tool_Manager SHALL preserve the conversation context

### Requirement 5: 对话会话管理

**User Story:** As a developer, I want to persist and organize my AI conversations by project, so that I can easily find and continue past work.

#### Acceptance Criteria

1. WHEN a conversation occurs, THE Session_Store SHALL automatically persist messages to local storage
2. WHEN the application restarts, THE Session_Store SHALL restore all previous sessions and conversations
3. WHEN displaying sessions, THE AI_Tool_Manager SHALL group them by project and show tool type, date, and summary
4. WHEN a user searches sessions, THE AI_Tool_Manager SHALL filter by project name, tool type, and content keywords
5. WHEN a user deletes a session, THE Session_Store SHALL remove it from storage and update the view
6. THE AI_Tool_Manager SHALL support exporting sessions to Markdown format

### Requirement 6: MCP 集成与多 AI 协调

**User Story:** As a developer, I want to coordinate multiple AI tools on the same project, so that I can leverage each tool's strengths for different tasks.

#### Acceptance Criteria

1. THE MCP_Service SHALL implement Model Context Protocol for AI tool communication
2. WHEN a user creates a coordinated task, THE MCP_Service SHALL distribute subtasks to appropriate AI tools
3. WHEN multiple AI tools work on the same project, THE MCP_Service SHALL manage context sharing between them
4. WHEN an AI tool completes a subtask, THE MCP_Service SHALL aggregate results and present a unified view
5. THE AI_Tool_Manager SHALL provide a visual workflow for defining multi-AI task pipelines
6. IF an AI tool fails during coordination, THEN THE MCP_Service SHALL handle the error and notify the user

### Requirement 7: 提示词生成器

**User Story:** As a developer, I want to generate optimized prompts for different AI models, so that I can get better results from each tool.

#### Acceptance Criteria

1. THE Prompt_Generator SHALL maintain prompt templates optimized for each supported AI model
2. WHEN a user describes a task, THE Prompt_Generator SHALL generate model-specific prompts
3. WHEN generating prompts, THE Prompt_Generator SHALL include relevant project context automatically
4. THE AI_Tool_Manager SHALL allow users to save and reuse custom prompt templates
5. WHEN a prompt template is selected, THE Prompt_Generator SHALL preview the generated prompt before sending

### Requirement 8: 对话与内容渲染

**User Story:** As a developer, I want to view conversations and files with proper formatting, so that I can easily read code and documentation.

#### Acceptance Criteria

1. WHEN displaying messages, THE Markdown_Renderer SHALL render Markdown with syntax highlighting for code blocks
2. WHEN a message contains code blocks, THE AI_Tool_Manager SHALL provide copy-to-clipboard functionality
3. WHEN displaying file diffs, THE AI_Tool_Manager SHALL use a side-by-side or unified diff view
4. WHEN a user opens a local Markdown file, THE Markdown_Renderer SHALL render it with GitHub Flavored Markdown support
5. WHEN the source file changes, THE AI_Tool_Manager SHALL detect and offer to reload the content

### Requirement 9: 数据持久化

**User Story:** As a developer, I want my data to persist locally and securely, so that I don't lose my work between sessions.

#### Acceptance Criteria

1. WHEN storing data, THE Session_Store SHALL serialize sessions, conversations, and settings to JSON format
2. WHEN the application starts, THE Session_Store SHALL load all persisted data from local storage
3. WHEN data is modified, THE Session_Store SHALL persist changes within 1 second
4. THE AI_Tool_Manager SHALL store data in the user's application data directory using Tauri's path API
5. THE AI_Tool_Manager SHALL support data backup and restore functionality

### Requirement 10: 跨平台支持

**User Story:** As a developer, I want to use this application on Windows, macOS, and Linux, so that I can work on any platform.

#### Acceptance Criteria

1. THE AI_Tool_Manager SHALL compile and run natively on Windows, macOS, and Linux
2. WHEN accessing file system paths, THE File_System_Service SHALL use platform-appropriate path handling
3. WHEN spawning CLI processes, THE AI_CLI_Adapter SHALL use platform-appropriate shell commands
4. THE AI_Tool_Manager SHALL follow each platform's native UI conventions for window controls

### Requirement 11: 用户界面

**User Story:** As a developer, I want a clean and efficient interface, so that I can focus on my work without distraction.

#### Acceptance Criteria

1. THE AI_Tool_Manager SHALL provide a three-panel layout: project tree, conversation, and file preview
2. THE AI_Tool_Manager SHALL provide a toolbar for AI tool selection and common actions
3. WHEN the window is resized, THE AI_Tool_Manager SHALL responsively adjust layout components
4. THE AI_Tool_Manager SHALL support light and dark theme modes with persistent preference
5. THE AI_Tool_Manager SHALL provide keyboard shortcuts for common operations
6. WHEN multiple conversations are active, THE AI_Tool_Manager SHALL support tabbed navigation

### Requirement 12: 扩展性与插件架构

**User Story:** As a developer, I want to extend the application with new AI tools and features, so that I can adapt it to future needs.

#### Acceptance Criteria

1. THE AI_Tool_Manager SHALL provide a plugin API for adding new AI CLI tool adapters
2. THE AI_Tool_Manager SHALL provide a plugin API for adding new prompt templates
3. WHEN a plugin is installed, THE AI_Tool_Manager SHALL load it without requiring restart
4. THE AI_Tool_Manager SHALL validate plugin compatibility before loading
