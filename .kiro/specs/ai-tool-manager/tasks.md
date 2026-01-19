# Implementation Plan: OmniAI Studio

## Overview

基于 Tauri 2.0 + Vue3 + TypeScript + Pinia 技术栈，分阶段实现 OmniAI Studio 的核心功能。采用自底向上的方式，先搭建基础架构，再逐步实现各功能模块。重点包括 AI 运行时管理、项目开发工作流、配置管理中心、对话系统、提示词工程实验室、以及 MCP 与 Agent Skills 管理。

## Tasks

- [x] 1. 项目初始化与基础架构
  - [x] 1.1 创建 Tauri 2.0 + Vue3 + TypeScript 项目
    - 使用 `npm create tauri-app` 初始化项目
    - 配置 TypeScript、Pinia、Vue Router
    - 配置 TailwindCSS 和 Naive UI
    - _Requirements: 25.1_

  - [x] 1.2 设置 Rust 后端基础结构
    - 创建模块目录结构 (filesystem, runtime_monitor, process, cli_adapter, config, mcp, skills, database, secure_storage, token_estimator)
    - 定义通用错误类型 AppError
    - 配置 Tauri 2.0 权限 (fs, shell, path, process, dialog)
    - _Requirements: 25.1_

  - [x] 1.3 创建 Pinia stores 基础结构
    - 创建 runtimeStore, projectStore, sessionStore, promptStore, configStore, mcpStore, skillsStore, settingsStore
    - 定义基础接口和类型
    - _Requirements: 29.2_

  - [x] 1.4 配置数据库和安全存储
    - 集成 SQLite (使用 rusqlite)
    - 集成 Tauri Plugin Keyring (系统级安全存储)
    - 创建数据库 schema (sessions, messages, messages_fts)
    - _Requirements: 24.2, 29.2_

- [x] 2. 文件系统服务与 Token 估算
  - [x] 2.1 实现 Rust FileSystemService
    - 实现 read_directory 命令（支持 gitignore 过滤）
    - 实现 read_file 和 write_file 命令
    - 实现 validate_path 命令（验证路径是否存在、可读、是否为目录）
    - 实现路径规范化函数（支持相对路径和绝对路径）
    - 实现 load_gitignore 和 apply_file_changes 命令
    - _Requirements: 4.1, 4.3, 4.4, 6.6, 25.3_

  - [x] 2.2 编写 FileSystemService 属性测试
    - **Property 5: Path Validation Correctness**
    - **Property 6: File Tree Completeness**
    - **Property 7: Gitignore Filtering Correctness**
    - **Property 10: File Change Application**
    - **Property 39: Cross-Platform Path Handling**
    - **Validates: Requirements 4.1, 4.3, 4.4, 6.6, 25.3**

  - [x] 2.3 实现 TokenEstimator 服务
    - 集成 tiktoken 或类似 tokenizer 库
    - 实现 estimate_tokens 和 estimate_tokens_batch 命令
    - 实现 get_token_limit 命令（支持不同模型）
    - _Requirements: 5.3_

  - [x] 2.4 编写 TokenEstimator 属性测试
    - **Property 8: Token Estimation Accuracy**
    - **Validates: Requirements 5.3**

- [x] 3. AI 运行时管理
  - [x] 3.1 实现 RuntimeMonitor 服务
    - 实现 scan_runtimes 命令（扫描 PATH 中的 AI 工具）
    - 实现 get_runtime_status 命令
    - 实现 estimate_resource_usage 命令（内存、VRAM、CPU）
    - 实现 validate_runtime_path 命令
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3_

  - [x] 3.2 编写 RuntimeMonitor 属性测试
    - **Property 1: Runtime Detection Completeness**
    - **Property 2: Runtime Status Consistency**
    - **Validates: Requirements 1.2, 1.7, 2.1, 2.5**

  - [x] 3.3 实现 ProcessManager 服务
    - 实现 start_runtime 命令
    - 实现 stop_runtime 和 restart_runtime 命令
    - 实现 stream_process_output 命令（实时日志）
    - 实现 send_to_process 命令
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 3.4 编写 ProcessManager 属性测试
    - **Property 3: Runtime Control Commands**
    - **Property 4: Process Output Capture Completeness**
    - **Validates: Requirements 3.1, 3.6**

  - [x] 3.5 实现 RuntimeStore
    - 实现 scanForRuntimes 方法
    - 实现 startRuntime, stopRuntime, restartRuntime 方法
    - 实现 streamLogs 方法
    - 实现 estimateResourceUsage 方法
    - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.5, 3.6_

  - [x] 3.6 创建 RuntimeManagerView 组件
    - 显示已检测的 AI 运行时列表
    - 显示运行时状态、版本、资源使用
    - 提供启动/停止/重启按钮
    - 实现实时日志查看器
    - _Requirements: 1.7, 2.1, 2.5, 3.1, 3.2, 3.3, 3.6_

- [x] 4. Checkpoint - AI 运行时管理验证
  - 确保可以检测、启动、停止 AI 运行时
  - 确保可以查看实时日志和资源使用
  - 确保所有测试通过，如有问题请询问用户

- [x] 5. 项目管理与上下文注入
  - [x] 5.1 实现 ProjectStore
    - 实现 validateProjectPath 方法（调用后端验证路径）
    - 实现 openProject 方法（接收路径字符串）
    - 实现 closeProject 方法
    - 实现 refreshFileTree 方法（支持 gitignore 过滤）
    - 实现 toggleFileSelection 和 clearSelection 方法
    - 实现 calculateTokens 方法
    - 实现 recentProjects 管理
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 5.1, 5.2, 5.3, 5.4_

  - [x] 5.2 编写 ProjectStore 属性测试
    - **Property 9: Token Limit Enforcement**
    - **Validates: Requirements 5.7**

  - [x] 5.3 创建 ProjectPathInput 组件
    - 实现路径输入框
    - 实现实时路径验证
    - 实现最近项目列表（点击可快速打开）
    - 实现拖拽文件夹导入
    - 实现错误提示显示
    - _Requirements: 4.1, 4.2, 4.8_

  - [x] 5.4 创建 FileTree 组件
    - 实现文件树可视化（文件夹图标、文件图标、缩进）
    - 实现展开/折叠功能
    - 实现文件选择复选框（用于上下文注入）
    - 实现 gitignore 过滤显示
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 5.1_

  - [x] 5.5 创建 ContextPanel 组件
    - 显示已选择的文件列表
    - 实时显示 Token 计数
    - 显示 Token 限制警告
    - 提供移除文件和清空按钮
    - _Requirements: 5.3, 5.4, 5.7_

  - [x] 5.6 创建 ProjectView 组件
    - 集成 ProjectPathInput 组件
    - 集成 FileTree 组件
    - 实现文件内容预览（语法高亮）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 6. Checkpoint - 项目管理验证
  - 确保可以打开项目并显示文件树
  - 确保可以选择文件并查看 Token 计数
  - 确保 gitignore 过滤正常工作
  - 确保所有测试通过，如有问题请询问用户

- [ ] 7. 数据持久化层（SQLite + Tauri Plugin Store）
  - [x] 7.1 实现 DatabaseService
    - 实现 init_database 命令
    - 实现 save_session 和 load_sessions 命令
    - 实现 save_message 和 load_messages 命令
    - 实现 search_messages 命令（全文搜索）
    - 实现 delete_session 命令
    - 实现 export_session 命令（Markdown, JSON, PDF）
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 12.1, 12.2, 12.3, 12.4, 12.5, 29.2_

  - [x] 7.2 编写 DatabaseService 属性测试
    - **Property 17: Message Persistence**
    - **Property 18: Session Data Round-Trip Persistence**
    - **Property 19: Full-Text Search Completeness**
    - **Validates: Requirements 10.1, 10.2, 10.5**

  - [x] 7.3 实现 SecureStorage 服务
    - 集成 Tauri Plugin Keyring
    - 实现 store_credential 和 retrieve_credential 命令
    - 实现 delete_credential 和 list_credentials 命令
    - _Requirements: 24.2, 24.3, 24.4, 24.5_

  - [x] 7.4 编写 SecureStorage 属性测试
    - **Property 37: Secure Credential Storage**
    - **Validates: Requirements 24.2**

  - [x] 7.5 实现 Tauri Plugin Store 配置持久化
    - 实现 settings.json 读写
    - 实现 projects.json 读写
    - 实现 runtimes.json 读写
    - _Requirements: 29.1, 29.2_

- [ ] 8. 会话管理模块
  - [x] 8.1 实现 SessionStore
    - 实现 createSession、loadSessions、saveSessions 方法
    - 实现 addMessage 方法
    - 实现 renameSession 方法
    - 实现会话按项目分组（groupByProject）
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 10.1, 10.2_

  - [x] 8.2 编写 SessionStore 属性测试
    - **Property 15: Session ID Uniqueness**
    - **Property 16: Session History Loading**
    - **Validates: Requirements 9.2, 9.3**

  - [x] 8.3 实现会话搜索功能
    - 实现 searchSessions 方法（调用后端全文搜索）
    - 实现搜索结果高亮
    - _Requirements: 10.4, 10.5, 10.6, 10.7_

  - [x] 8.4 实现会话删除功能
    - 实现 deleteSession 方法
    - 清理关联的对话数据
    - _Requirements: 10.1_

  - [x] 8.5 实现会话导出功能
    - 实现 exportSession 方法（Markdown, JSON, PDF）
    - 生成格式化输出
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 8.6 编写会话导出属性测试
    - **Property 22: Conversation Export Completeness**
    - **Validates: Requirements 12.3**

- [ ] 9. 对话界面
  - [x] 9.1 创建 ConversationView 组件
    - 实现消息列表显示
    - 实现用户/AI 消息区分
    - 实现消息输入框
    - 实现会话标签页导航
    - _Requirements: 9.4, 11.1_

  - [x] 9.2 实现 Markdown 渲染
    - 集成 markdown-it
    - 集成 highlight.js 代码高亮
    - 实现代码块复制功能
    - 实现代码块"插入到文件"功能
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 9.3 编写 Markdown 解析属性测试
    - **Property 20: Markdown Rendering Correctness**
    - **Property 21: Code Block Detection**
    - **Validates: Requirements 11.1, 11.2**

  - [x] 9.4 实现 DiffView 组件
    - 创建 DiffView 组件
    - 支持并排和统一视图
    - 实现批准/拒绝/编辑操作
    - _Requirements: 6.5, 6.6, 6.7_

- [x] 10. Checkpoint - 对话功能验证
  - 确保可以创建会话并发送消息
  - 确保 Markdown 和代码高亮正确渲染
  - 确保会话可以搜索、导出、删除
  - 确保所有测试通过，如有问题请询问用户

- [ ] 11. AI CLI 适配器与交互
  - [ ] 11.1 实现 CLIAdapterRegistry
    - 定义支持的 AI CLI 工具列表 (Ollama, LocalAI, Claude Code, etc.)
    - 实现工具检测命令
    - 实现版本检查
    - 实现 send_message_to_cli 命令
    - _Requirements: 1.1, 1.2, 1.4_

  - [ ] 11.2 实现 AI 消息流式传输
    - 实现流式响应处理
    - 解析 AI 输出中的文件变更
    - 解析 AI 输出中的 Skill 调用
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 11.3 集成 AI 适配器到 ConversationView
    - 实现发送消息到 AI
    - 实现流式响应显示
    - 实现文件变更 Diff 显示
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 12. 配置管理中心
  - [ ] 12.1 实现 ConfigManager 服务
    - 实现 scan_config_files 命令
    - 实现 read_config 和 write_config 命令
    - 实现 validate_config 命令
    - 实现 create_config_backup 命令
    - 实现 restore_config_version 和 get_config_history 命令
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9_

  - [ ] 12.2 编写 ConfigManager 属性测试
    - **Property 11: Config File Discovery**
    - **Property 12: Config Backup Before Save**
    - **Property 13: Config Rollback Round-Trip**
    - **Validates: Requirements 7.1, 7.7, 7.9**

  - [ ] 12.3 实现 ConfigStore
    - 实现 scanConfigs 方法
    - 实现 loadConfig, saveConfig, validateConfig 方法
    - 实现 createBackup, restoreVersion 方法
    - 实现 getModelParameters, updateParameter 方法
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 12.4 编写 ConfigStore 属性测试
    - **Property 14: Parameter Update Reactivity**
    - **Validates: Requirements 8.2**

  - [ ] 12.5 创建 ConfigHubView 组件
    - 显示配置文件列表
    - 实现配置编辑器（Form 模式和 Source 模式）
    - 实现配置历史查看和回滚
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 7.9_

  - [ ] 12.6 创建 ModelParameters 组件
    - 实现参数滑块（Temperature, Top_P, Context Window）
    - 显示参数描述和推荐范围
    - 实现实时参数更新
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 13. Checkpoint - 配置管理验证
  - 确保可以发现、编辑、保存配置文件
  - 确保可以创建备份和回滚
  - 确保模型参数可以调整
  - 确保所有测试通过，如有问题请询问用户

- [ ] 14. 提示词工程实验室
  - [ ] 14.1 实现 PromptStore
    - 实现 loadTemplates, saveTemplate, deleteTemplate 方法
    - 实现 generatePrompt 方法（模板变量插值）
    - 实现 enhancePrompt 方法（Magic Enhance）
    - 实现 createABTest, runABTest, rateVariant 方法
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ] 14.2 编写 PromptStore 属性测试
    - **Property 23: Template Variable Interpolation**
    - **Property 24: Template Persistence Round-Trip**
    - **Property 25: Prompt Enhancement Expansion**
    - **Property 26: A/B Test Variant Execution**
    - **Validates: Requirements 13.4, 13.7, 14.2, 15.3**

  - [ ] 14.3 创建 PromptLabView 组件
    - 实现模板浏览器（显示内置和自定义模板）
    - 实现模板编辑器（支持变量定义）
    - 实现变量填充表单
    - 实现模板分类管理
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ] 14.4 创建 MagicEnhance 组件
    - 实现简短描述输入
    - 实现目标模型选择
    - 实现增强提示词预览
    - 集成项目上下文
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ] 14.5 创建 ABTest 组件
    - 实现变体定义界面
    - 实现并排响应对比视图
    - 实现评分功能
    - 实现测试结果保存
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ] 15. Checkpoint - 提示词实验室验证
  - 确保可以创建、使用、保存模板
  - 确保 Magic Enhance 功能正常
  - 确保 A/B 测试可以运行和对比
  - 确保所有测试通过，如有问题请询问用户

- [ ] 16. MCP 集成
  - [ ] 16.1 实现 MCPService
    - 实现 connect_mcp_server 命令
    - 实现 disconnect_mcp_server 命令
    - 实现 discover_mcp_resources 和 discover_mcp_tools 命令
    - 实现 invoke_mcp_tool 命令
    - 实现 get_mcp_resource_status 命令
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 16.2 编写 MCPService 属性测试
    - **Property 27: MCP Resource Discovery**
    - **Validates: Requirements 16.4, 17.7**

  - [ ] 16.3 实现 MCPStore
    - 实现 connectServer, disconnectServer 方法
    - 实现 discoverResources, discoverTools 方法
    - 实现 invokeTool, getResourceStatus 方法
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [ ] 16.4 创建 MCPView 组件
    - 显示已连接的 MCP 服务器列表
    - 显示服务器状态和连接信息
    - 显示可用资源和工具
    - 实现添加/移除服务器
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

- [~] 17. Agent Skills 管理
  - [~] 17.1 实现 SkillsExecutor 服务
    - 实现 execute_skill 命令
    - 实现 approve_skill_execution 和 deny_skill_execution 命令
    - 实现 get_execution_history 命令
    - 实现内置 skills: skill_run_terminal_command, skill_read_file, skill_write_file, skill_delete_file
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

  - [~] 17.2 编写 SkillsExecutor 属性测试
    - **Property 28: Skill Signature Validation**
    - **Property 29: Skill Persistence Round-Trip**
    - **Property 30: Sensitive Skill Classification**
    - **Property 31: Approved Skill Execution**
    - **Property 32: Skill Execution Logging**
    - **Validates: Requirements 18.4, 18.5, 19.2, 19.5, 19.7**

  - [~] 17.3 实现 SkillsStore
    - 实现 registerSkill, unregisterSkill 方法
    - 实现 executeSkill, approveExecution, denyExecution 方法
    - 实现 getExecutionHistory 方法
    - 实现 saveWorkflow, executeWorkflow 方法
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

  - [~] 17.4 编写 SkillsStore 属性测试
    - **Property 33: Workflow Node Type Validation**
    - **Property 34: Workflow Execution Order**
    - **Validates: Requirements 20.3, 20.6**

  - [~] 17.5 创建 SkillsView 组件
    - 显示已注册的 Skills 列表
    - 实现 Skill 注册表单
    - 实现 Skill 编辑和删除
    - 显示 Skill 执行历史
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 19.8_

  - [~] 17.6 创建 SkillApproval 通知组件
    - 实现系统原生通知
    - 显示 Skill 名称、参数、操作按钮
    - 实现批准/拒绝操作
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

  - [~] 17.7 创建 WorkflowEditor 组件
    - 实现节点式工作流编辑器
    - 实现节点拖拽和连接
    - 实现类型验证
    - 实现工作流执行和进度显示
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7, 20.8_

- [~] 18. Checkpoint - MCP 和 Skills 验证
  - 确保可以连接 MCP 服务器并发现资源
  - 确保可以注册和执行 Agent Skills
  - 确保 Skill 审批流程正常工作
  - 确保工作流可以创建和执行
  - 确保所有测试通过，如有问题请询问用户

- [~] 19. 用户界面完善
  - [~] 19.1 实现 IDE 风格三栏布局
    - 创建主布局组件（导航、主工作区、上下文面板）
    - 实现可调整大小的面板
    - 实现面板折叠/展开
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

  - [~] 19.2 编写布局属性测试
    - **Property 35: Panel Size Persistence**
    - **Validates: Requirements 21.5**

  - [~] 19.3 实现主题系统
    - 实现 light/dark/system 主题
    - 实现主题自动跟随系统
    - 实现主题持久化
    - 实现平滑主题切换
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

  - [~] 19.4 编写主题属性测试
    - **Property 36: Theme Preference Persistence**
    - **Validates: Requirements 22.4**

  - [~] 19.5 实现键盘快捷键系统
    - 定义常用快捷键（新建会话、切换会话、发送消息、搜索）
    - 实现 Cmd+K / Ctrl+K 命令面板
    - 实现 Cmd+P / Ctrl+P 文件搜索
    - 实现快捷键自定义
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7_

  - [~] 19.6 实现导航栏
    - 创建导航栏组件（项目、对话、提示词、配置、MCP、Skills、设置）
    - 实现图标和标签显示
    - 实现折叠模式（仅图标）
    - _Requirements: 21.2_

- [~] 20. 错误处理与恢复
  - [~] 20.1 实现前端错误处理
    - 创建 errorHandler 工具函数
    - 实现错误通知和对话框
    - 实现 Vue 错误边界
    - _Requirements: 28.1, 28.2, 28.3_

  - [~] 20.2 编写错误处理属性测试
    - **Property 41: Error Message Generation**
    - **Property 42: Crash State Preservation**
    - **Validates: Requirements 28.1, 28.4**

  - [~] 20.3 实现后端错误处理
    - 完善 AppError 枚举
    - 实现用户友好错误消息生成
    - 实现建议操作生成
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7_

  - [~] 20.4 实现崩溃恢复
    - 实现应用状态保存
    - 实现启动时状态恢复
    - 实现会话恢复提示
    - _Requirements: 28.4, 28.7_

- [~] 21. 数据备份与恢复
  - [~] 21.1 实现备份功能
    - 实现手动备份（导出到 ZIP）
    - 实现自动备份（每日）
    - 实现备份保留策略（保留最近 7 天）
    - _Requirements: 29.3, 29.4, 29.5, 29.6, 29.7_

  - [~] 21.2 实现恢复功能
    - 实现从 ZIP 恢复数据
    - 实现恢复前确认
    - _Requirements: 29.6, 29.7_

  - [~] 21.3 编写备份恢复属性测试
    - **Property 43: Backup and Restore Round-Trip**
    - **Validates: Requirements 29.6**

- [~] 22. 安全性与隐私
  - [~] 22.1 实现数据导出过滤
    - 实现导出时排除 API keys 和 credentials
    - 实现敏感数据检测
    - _Requirements: 24.6, 24.7, 24.8_

  - [~] 22.2 编写安全性属性测试
    - **Property 38: Export Data Sanitization**
    - **Validates: Requirements 24.7**

  - [~] 22.3 实现安全审计日志
    - 记录敏感操作（Skill 执行、配置修改、凭据访问）
    - 实现日志查看界面
    - _Requirements: 24.8_

- [~] 23. 自动更新机制
  - [~] 23.1 集成 Tauri Updater
    - 实现启动时检查更新
    - 实现更新通知
    - 实现更新下载和安装
    - 实现签名验证
    - 实现更新失败回滚
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7_

  - [~] 23.2 编写更新机制属性测试
    - **Property 40: Update Signature Verification**
    - **Validates: Requirements 26.5**

- [~] 24. 插件系统
  - [~] 24.1 定义插件 API
    - 定义 CLI 适配器插件接口
    - 定义提示词模板插件接口
    - 定义 Agent Skill 插件接口
    - _Requirements: 30.1, 30.2, 30.3_

  - [~] 24.2 实现插件加载器
    - 实现插件发现
    - 实现动态加载（无需重启）
    - 实现插件沙箱
    - _Requirements: 30.4, 30.7_

  - [~] 24.3 编写插件系统属性测试
    - **Property 44: Plugin Hot-Loading**
    - **Property 45: Plugin Validation**
    - **Validates: Requirements 30.4, 30.5**

  - [~] 24.4 实现插件验证
    - 实现 manifest 验证
    - 实现版本兼容性检查
    - 实现安全权限检查
    - _Requirements: 30.5, 30.7_

- [~] 25. 性能优化
  - [~] 25.1 实现虚拟滚动
    - 为大型文件树实现虚拟滚动
    - 为消息列表实现虚拟滚动
    - _Requirements: 23.3_

  - [~] 25.2 实现 Web Workers
    - 将 Token 估算移至 Web Worker
    - 将大文件解析移至 Web Worker
    - _Requirements: 23.5_

  - [~] 25.3 优化启动时间
    - 实现懒加载
    - 优化初始化流程
    - _Requirements: 23.1, 23.2_

- [~] 26. Final Checkpoint - 完整功能验证
  - 确保所有功能正常工作
  - 确保所有测试通过
  - 确保跨平台构建成功（Windows, macOS, Linux）
  - 进行性能测试（启动时间、大项目加载、Token 估算）
  - 如有问题请询问用户

## Notes

- 每个任务都引用了具体的需求编号以便追溯
- 所有测试任务都是必需的，确保全面的质量保证
- Checkpoint 任务用于阶段性验证
- 属性测试验证核心正确性属性（最少 100 次迭代）
- 单元测试验证具体示例和边界情况
- 集成测试验证组件间交互
- E2E 测试验证完整用户工作流
