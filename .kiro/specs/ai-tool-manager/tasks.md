# Implementation Plan: AI Tool Manager

## Overview

基于 Tauri + Vue3 + TypeScript + Pinia 技术栈，分阶段实现 AI Tool Manager 的核心功能。采用自底向上的方式，先搭建基础架构，再逐步实现各功能模块。

## Tasks

- [x] 1. 项目初始化与基础架构
  - [x] 1.1 创建 Tauri + Vue3 + TypeScript 项目
    - 使用 `npm create tauri-app` 初始化项目
    - 配置 TypeScript、Pinia、Vue Router
    - 配置 Tailwind CSS
    - _Requirements: 10.1_

  - [x] 1.2 设置 Rust 后端基础结构
    - 创建模块目录结构 (filesystem, process, cli_adapter, config, mcp)
    - 定义通用错误类型 AppError
    - 配置 Tauri 权限 (fs, shell, path)
    - _Requirements: 10.1_

  - [x] 1.3 创建 Pinia stores 基础结构
    - 创建 projectStore, sessionStore, toolStateStore, settingsStore
    - 定义基础接口和类型
    - _Requirements: 9.1, 9.2_

- [ ] 2. 文件系统服务
  - [ ] 2.1 实现 Rust FileSystemService
    - 实现 read_directory 命令
    - 实现 read_file 和 write_file 命令
    - 实现路径规范化函数
    - _Requirements: 1.1, 10.2_

  - [ ] 2.2 编写 FileSystemService 属性测试
    - **Property 1: Project File Tree Completeness**
    - **Property 21: Cross-Platform Path Handling**
    - **Validates: Requirements 1.1, 10.2**

  - [ ] 2.3 实现前端文件树组件
    - 创建 FileTreeNode 组件
    - 实现目录展开/折叠
    - 实现文件选择和内容显示
    - _Requirements: 1.2, 1.3_

- [ ] 3. 项目管理模块
  - [ ] 3.1 实现 ProjectStore
    - 实现 openProject、closeProject 方法
    - 实现 recentProjects 管理
    - 实现项目数据持久化
    - _Requirements: 1.1, 1.4, 1.5_

  - [ ] 3.2 编写 ProjectStore 属性测试
    - **Property 2: Recent Projects List Invariant**
    - **Validates: Requirements 1.4**

  - [ ] 3.3 创建 ProjectView 组件
    - 实现项目选择对话框
    - 实现最近项目列表
    - 集成文件树组件
    - _Requirements: 1.2, 1.4_

- [ ] 4. Checkpoint - 基础架构验证
  - 确保项目可以打开并显示文件树
  - 确保所有测试通过，如有问题请询问用户

- [ ] 5. 数据持久化层
  - [ ] 5.1 实现 JSON 序列化/反序列化
    - 创建数据存储工具函数
    - 实现 Tauri app_data_dir 路径获取
    - 实现自动保存机制
    - _Requirements: 9.1, 9.4_

  - [ ] 5.2 编写数据持久化属性测试
    - **Property 3: Session Data Round-Trip Persistence**
    - **Validates: Requirements 5.1, 5.2, 9.1, 9.2**

  - [ ] 5.3 实现备份/恢复功能
    - 实现数据导出到 ZIP
    - 实现从 ZIP 恢复数据
    - _Requirements: 9.5_

  - [ ] 5.4 编写备份恢复属性测试
    - **Property 20: Backup/Restore Round-Trip**
    - **Validates: Requirements 9.5**

- [ ] 6. 会话管理模块
  - [ ] 6.1 实现 SessionStore
    - 实现 createSession、loadSessions、saveSessions 方法
    - 实现 addMessage 方法
    - 实现会话按项目分组
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ] 6.2 编写 SessionStore 属性测试
    - **Property 10: Session Grouping Correctness**
    - **Validates: Requirements 5.3**

  - [ ] 6.3 实现会话搜索功能
    - 实现关键词搜索
    - 实现按项目、工具类型过滤
    - _Requirements: 5.4_

  - [ ] 6.4 编写会话搜索属性测试
    - **Property 11: Session Search Filtering**
    - **Validates: Requirements 5.4**

  - [ ] 6.5 实现会话删除功能
    - 实现 deleteSession 方法
    - 清理关联的对话数据
    - _Requirements: 5.5_

  - [ ] 6.6 编写会话删除属性测试
    - **Property 12: Session Deletion Completeness**
    - **Validates: Requirements 5.5**

  - [ ] 6.7 实现会话导出功能
    - 实现 exportSession 方法
    - 生成 Markdown 格式输出
    - _Requirements: 5.6_

  - [ ] 6.8 编写会话导出属性测试
    - **Property 13: Session Export to Markdown**
    - **Validates: Requirements 5.6**

- [ ] 7. Checkpoint - 会话管理验证
  - 确保会话可以创建、保存、搜索、删除、导出
  - 确保所有测试通过，如有问题请询问用户

- [ ] 8. AI CLI 工具检测与配置
  - [ ] 8.1 实现 CLIAdapterRegistry
    - 定义支持的 AI CLI 工具列表 (Codex, Claude Code, Google CLI)
    - 实现工具检测命令
    - 实现版本检查
    - _Requirements: 2.3, 3.1_

  - [ ] 8.2 实现 ToolStateStore
    - 实现 detectInstalledTools 方法
    - 实现状态映射逻辑
    - _Requirements: 2.4, 3.2_

  - [ ] 8.3 编写工具检测属性测试
    - **Property 4: Tool Detection Status Mapping**
    - **Validates: Requirements 2.4**

  - [ ] 8.4 实现 ConfigManager
    - 实现配置文件读取/写入
    - 实现配置验证
    - _Requirements: 2.5, 2.6_

  - [ ] 8.5 编写配置验证属性测试
    - **Property 5: Configuration Validation Consistency**
    - **Validates: Requirements 2.6**

  - [ ] 8.6 实现配置导入/导出
    - 实现配置导出到文件
    - 实现从文件导入配置
    - _Requirements: 2.7_

  - [ ] 8.7 编写配置导入导出属性测试
    - **Property 6: Configuration Import/Export Round-Trip**
    - **Validates: Requirements 2.7**

  - [ ] 8.8 实现健康检查功能
    - 实现 checkToolHealth 方法
    - 实现错误消息和建议生成
    - _Requirements: 3.4, 3.5_

  - [ ] 8.9 编写健康检查属性测试
    - **Property 7: Health Check Error Handling**
    - **Validates: Requirements 3.3, 3.5**

- [ ] 9. AI CLI 工具配置 UI
  - [ ] 9.1 创建 ToolConfigEditor 组件
    - 实现配置文件编辑器
    - 实现语法高亮
    - 实现保存前验证
    - _Requirements: 2.5, 2.6_

  - [ ] 9.2 创建 ToolStatusPanel 组件
    - 显示已安装工具列表
    - 显示工具状态和版本
    - 提供健康检查按钮
    - _Requirements: 2.3, 2.4, 3.1_

- [ ] 10. Checkpoint - AI CLI 工具管理验证
  - 确保可以检测、配置、验证 AI CLI 工具
  - 确保所有测试通过，如有问题请询问用户

- [ ] 11. AI CLI 进程管理
  - [ ] 11.1 实现 ProcessManager
    - 实现 spawn_cli_process 命令
    - 实现 send_to_process 命令
    - 实现 kill_process 命令
    - 实现输出流处理
    - _Requirements: 4.2, 4.3_

  - [ ] 11.2 实现工具切换与上下文保持
    - 实现 switchTool 方法
    - 保持对话上下文
    - _Requirements: 4.6_

  - [ ] 11.3 编写上下文保持属性测试
    - **Property 9: Context Preservation on Tool Switch**
    - **Validates: Requirements 4.6**

  - [ ] 11.4 实现文件变更检测与 Diff 显示
    - 解析 AI 工具输出中的文件变更
    - 生成 diff 视图
    - _Requirements: 4.4_

  - [ ] 11.5 编写 Diff 生成属性测试
    - **Property 8: File Change Diff Generation**
    - **Validates: Requirements 4.4**

- [ ] 12. 对话界面
  - [ ] 12.1 创建 ConversationView 组件
    - 实现消息列表显示
    - 实现用户/AI 消息区分
    - 实现消息输入框
    - _Requirements: 8.1_

  - [ ] 12.2 实现 Markdown 渲染
    - 集成 markdown-it
    - 集成 highlight.js 代码高亮
    - 实现代码块复制功能
    - _Requirements: 8.1, 8.2, 8.4_

  - [ ] 12.3 编写 Markdown 解析属性测试
    - **Property 19: Markdown Parsing Correctness**
    - **Validates: Requirements 8.1, 8.4**

  - [ ] 12.4 实现 Diff 视图组件
    - 创建 DiffView 组件
    - 支持并排和统一视图
    - _Requirements: 8.3_

  - [ ] 12.5 编写 Diff 视图属性测试
    - **Property 8: File Change Diff Generation** (前端部分)
    - **Validates: Requirements 8.3**

- [ ] 13. Checkpoint - 对话功能验证
  - 确保可以与 AI CLI 工具进行对话
  - 确保 Markdown 和 Diff 正确渲染
  - 确保所有测试通过，如有问题请询问用户

- [ ] 14. 提示词生成器
  - [ ] 14.1 实现 PromptGenerator 服务
    - 定义模型特定的提示词模板
    - 实现模板变量替换
    - 实现项目上下文注入
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 14.2 编写提示词生成属性测试
    - **Property 17: Prompt Generation with Context**
    - **Validates: Requirements 7.2, 7.3**

  - [ ] 14.3 实现模板管理
    - 实现模板保存/加载
    - 实现自定义模板创建
    - _Requirements: 7.4_

  - [ ] 14.4 编写模板持久化属性测试
    - **Property 18: Prompt Template Persistence**
    - **Validates: Requirements 7.4**

  - [ ] 14.5 创建 PromptGenerator 组件
    - 实现任务描述输入
    - 实现模型选择
    - 实现提示词预览
    - _Requirements: 7.5_

- [ ] 15. MCP 集成
  - [ ] 15.1 实现 MCPService 基础
    - 实现 MCP 会话创建
    - 实现工具注册
    - _Requirements: 6.1_

  - [ ] 15.2 实现任务分发
    - 实现 distribute_task 命令
    - 实现任务到工具的映射
    - _Requirements: 6.2_

  - [ ] 15.3 编写任务分发属性测试
    - **Property 14: MCP Task Distribution**
    - **Validates: Requirements 6.2**

  - [ ] 15.4 实现结果聚合
    - 实现多工具结果收集
    - 实现统一视图生成
    - _Requirements: 6.3, 6.4_

  - [ ] 15.5 编写结果聚合属性测试
    - **Property 15: MCP Result Aggregation**
    - **Validates: Requirements 6.3, 6.4**

  - [ ] 15.6 实现错误处理
    - 实现工具失败捕获
    - 实现优雅降级
    - _Requirements: 6.6_

  - [ ] 15.7 编写 MCP 错误处理属性测试
    - **Property 16: MCP Error Handling**
    - **Validates: Requirements 6.6**

- [ ] 16. Checkpoint - MCP 功能验证
  - 确保可以协调多个 AI 工具
  - 确保所有测试通过，如有问题请询问用户

- [ ] 17. 用户界面完善
  - [ ] 17.1 实现三栏布局
    - 创建主布局组件
    - 实现可调整大小的面板
    - _Requirements: 11.1_

  - [ ] 17.2 实现工具栏
    - 创建 AI 工具选择器
    - 创建常用操作按钮
    - _Requirements: 11.2_

  - [ ] 17.3 实现主题切换
    - 实现 light/dark/system 主题
    - 实现主题持久化
    - _Requirements: 11.4_

  - [ ] 17.4 编写主题持久化属性测试
    - **Property 22: Theme Preference Persistence**
    - **Validates: Requirements 11.4**

  - [ ] 17.5 实现标签页导航
    - 实现多对话标签页
    - 实现标签页切换
    - _Requirements: 11.6_

  - [ ] 17.6 实现键盘快捷键
    - 定义常用快捷键
    - 实现快捷键处理
    - _Requirements: 11.5_

- [ ] 18. 插件系统
  - [ ] 18.1 定义插件 API
    - 定义 CLI 适配器插件接口
    - 定义提示词模板插件接口
    - _Requirements: 12.1, 12.2_

  - [ ] 18.2 实现插件加载器
    - 实现插件发现
    - 实现动态加载
    - _Requirements: 12.3_

  - [ ] 18.3 实现插件验证
    - 实现 manifest 验证
    - 实现版本兼容性检查
    - _Requirements: 12.4_

  - [ ] 18.4 编写插件验证属性测试
    - **Property 23: Plugin Validation**
    - **Validates: Requirements 12.4**

- [ ] 19. Final Checkpoint - 完整功能验证
  - 确保所有功能正常工作
  - 确保所有测试通过
  - 确保跨平台构建成功
  - 如有问题请询问用户

## Notes

- 每个任务都引用了具体的需求编号以便追溯
- Checkpoint 任务用于阶段性验证
- 属性测试验证核心正确性属性
- 单元测试验证具体示例和边界情况
