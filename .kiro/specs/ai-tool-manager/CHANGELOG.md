# Changelog

## 2026-01-19 - 项目打开方式优化

### 变更说明
将项目打开方式从"文件上传"改为"路径输入"，更符合桌面应用的使用习惯。

### 修改内容

#### Requirements (requirements.md)
- **Requirement 1.1**: 修改为"用户输入项目路径"而非"打开项目目录"
- **新增 1.7**: 提供路径输入框，支持自动补全和验证
- **新增 1.8**: 支持绝对路径和相对路径
- **新增 1.9**: 无效路径时显示清晰的错误消息

#### Design (design.md)
- **ProjectView 组件**: 新增 `ProjectPathInputProps` 和 `PathValidationResult` 接口
- **ProjectStore**: 新增 `validateProjectPath` 方法
- **FileSystemService**: 新增 `validate_path` 命令和 `PathValidation` 结构体
- **新增 Property 24**: Path Validation Correctness（路径验证正确性）

#### Tasks (tasks.md)
- **任务 2.1**: 新增 `validate_path` 命令实现
- **任务 2.2**: 新增 Property 24 的属性测试
- **任务 3.1**: 新增 `validateProjectPath` 方法实现
- **任务 3.2**: 新增 Property 24 的属性测试
- **任务 3.3**: 新增 `ProjectPathInput` 组件（路径输入框）
- **任务 3.4**: 重构 `ProjectView` 组件，集成路径输入功能

### 用户体验改进
1. 用户可以直接输入或粘贴项目路径
2. 实时验证路径有效性
3. 支持路径自动补全（可选）
4. 最近项目列表可快速打开
5. 清晰的错误提示

### 技术实现
- 前端：Vue3 组件 + Pinia Store
- 后端：Rust Tauri 命令
- 验证：路径存在性、可读性、目录类型检查
- 跨平台：支持 Windows、macOS、Linux 路径格式
