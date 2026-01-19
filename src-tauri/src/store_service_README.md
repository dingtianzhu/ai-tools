# Tauri Plugin Store Integration

## Overview

This module implements persistent configuration storage using Tauri Plugin Store. It provides type-safe read/write operations for three main configuration files:

- **settings.json** - Application settings (theme, language, editor preferences, keyboard shortcuts, token limits)
- **projects.json** - Project data and recent projects list
- **runtimes.json** - Custom AI runtime configurations and last scan timestamp

## Architecture

### Backend (Rust)

Located in `src-tauri/src/store_service.rs`, the backend provides:

1. **Data Structures**:
   - `SettingsData` - Settings configuration with camelCase JSON serialization
   - `ProjectsData` - Projects list and recent projects
   - `RuntimesData` - Custom runtimes and scan metadata

2. **Tauri Commands**:
   - `load_settings()` - Load settings from settings.json
   - `save_settings()` - Save settings to settings.json
   - `load_projects()` - Load projects from projects.json
   - `save_projects()` - Save projects to projects.json
   - `load_runtimes()` - Load runtimes from runtimes.json
   - `save_runtimes()` - Save runtimes to runtimes.json

### Frontend (TypeScript)

Located in `src/utils/store.ts`, the frontend provides:

1. **Type Definitions**: TypeScript interfaces matching Rust structures
2. **API Functions**: Type-safe wrappers around Tauri commands
3. **Error Handling**: Graceful fallback to default values on errors

### Store Integration

Located in `src/stores/`, each Pinia store has been enhanced with:

1. **loadFromStore()** - Async method to load persisted data on startup
2. **persistSettings/Projects/Runtimes()** - Async methods to save data
3. **Auto-save watchers** - Automatically persist changes when state updates

## Data Structures

### SettingsData

```typescript
interface SettingsData {
  version: number;
  theme: string;                          // 'light' | 'dark' | 'system'
  language: string;                       // e.g., 'zh-CN'
  editorFontSize: number;                 // 10-24
  autoSave: boolean;
  panelSizes: {
    navigation: number;
    main: number;
    context: number;
  };
  keyboardShortcuts: Record<string, string>;
  tokenLimits: Record<string, number>;
}
```

### ProjectsData

```typescript
interface ProjectsData {
  version: number;
  projects: Array<{
    id: string;
    name: string;
    path: string;
    lastOpened: number;
    aiToolsUsed: string[];
    gitignoreRules?: string[];
  }>;
  recentProjects: string[];  // project IDs
}
```

### RuntimesData

```typescript
interface RuntimesData {
  version: number;
  customRuntimes: Array<{
    id: string;
    name: string;
    type: string;
    executablePath: string;
    version: string | null;
    status: string;
    lastChecked: number;
  }>;
  lastScan: number;
}
```

## Usage

### Initialization

The stores are automatically initialized on app startup in `src/main.ts`:

```typescript
import { initializeStores } from './utils/initStores';

// After creating Pinia instance
initializeStores().then(() => {
  console.log('Stores initialized');
});
```

### Settings Store

```typescript
import { useSettingsStore } from '@/stores/settings';

const settingsStore = useSettingsStore();

// Load from persistent storage
await settingsStore.loadFromStore();

// Modify settings (auto-saves if autoSave is enabled)
settingsStore.setTheme('dark');
settingsStore.setEditorFontSize(16);

// Manual save
await settingsStore.persistSettings();
```

### Project Store

```typescript
import { useProjectStore } from '@/stores/project';

const projectStore = useProjectStore();

// Load from persistent storage
await projectStore.loadFromStore();

// Recent projects are automatically persisted when modified
await projectStore.openProject('/path/to/project');
```

### Runtime Store

```typescript
import { useRuntimeStore } from '@/stores/runtime';

const runtimeStore = useRuntimeStore();

// Load from persistent storage
await runtimeStore.loadFromStore();

// Custom runtimes are automatically persisted when modified
await runtimeStore.addCustomRuntime('/path/to/runtime');
```

## File Locations

The JSON files are stored in the application's data directory:

- **macOS**: `~/Library/Application Support/com.omniai.studio/`
- **Windows**: `%APPDATA%\com.omniai.studio\`
- **Linux**: `~/.local/share/com.omniai.studio/`

Files:
- `settings.json`
- `projects.json`
- `runtimes.json`

## Features

### Auto-save

Settings and projects automatically persist when modified (if autoSave is enabled):

```typescript
// Settings store watches for changes
watch(
  [theme, language, editorFontSize, autoSave, panelSizes],
  async () => {
    if (autoSave.value) {
      await persistSettings();
    }
  },
  { deep: true }
);
```

### Default Values

All stores provide sensible defaults if files don't exist or fail to load:

```rust
impl Default for SettingsData {
    fn default() -> Self {
        Self {
            version: 1,
            theme: "system".to_string(),
            language: "zh-CN".to_string(),
            editor_font_size: 14,
            auto_save: true,
            // ... more defaults
        }
    }
}
```

### Error Handling

All operations gracefully handle errors:

```typescript
async function loadSettings(): Promise<SettingsData> {
  try {
    return await invoke<SettingsData>('load_settings');
  } catch (error) {
    console.error('Failed to load settings:', error);
    // Return default settings on error
    return SettingsData.default();
  }
}
```

## Testing

### Unit Tests

Located in `src-tauri/src/store_service.rs`:

```rust
#[test]
fn test_settings_default() {
    let settings = SettingsData::default();
    assert_eq!(settings.version, 1);
    assert_eq!(settings.theme, "system");
    // ... more assertions
}
```

### Integration Tests

Located in `src-tauri/src/store_service_test.rs`:

```rust
#[test]
fn test_settings_data_round_trip() {
    let settings = SettingsData::default();
    let json = serde_json::to_string(&settings).unwrap();
    let deserialized: SettingsData = serde_json::from_str(&json).unwrap();
    assert_eq!(settings.version, deserialized.version);
    // ... more assertions
}
```

Run tests:
```bash
cargo test --manifest-path src-tauri/Cargo.toml store_service
```

## Requirements Validation

This implementation satisfies:

- **Requirement 29.1**: Data persistence within 1 second (auto-save on change)
- **Requirement 29.2**: Uses SQLite for conversations and Tauri Plugin Store for settings
- **Requirement 29.3**: Stores data in user's application data directory

## Migration Notes

### From localStorage to Tauri Plugin Store

The stores maintain backward compatibility with legacy methods:

```typescript
// Legacy methods still work
function loadFromStorage(data: any): void { ... }
function toStorageData(): any { ... }

// New methods for Tauri Plugin Store
async function loadFromStore(): Promise<void> { ... }
async function persistSettings(): Promise<void> { ... }
```

## Future Enhancements

1. **Versioning**: Implement data migration when version changes
2. **Validation**: Add schema validation for loaded data
3. **Encryption**: Encrypt sensitive settings (API keys already use secure storage)
4. **Backup**: Integrate with backup/restore system (Requirement 29.4-29.7)
5. **Sync**: Add cloud sync capabilities for settings

## Troubleshooting

### Settings not persisting

1. Check if autoSave is enabled: `settingsStore.autoSave`
2. Manually call `persistSettings()` to force save
3. Check console for error messages
4. Verify file permissions in app data directory

### Cannot load settings

1. Check if files exist in app data directory
2. Verify JSON format is valid
3. Check Tauri console for backend errors
4. Delete corrupted files to reset to defaults

### Type mismatches

1. Ensure Rust and TypeScript types match
2. Check camelCase/snake_case serialization
3. Verify version numbers match
4. Run tests to validate serialization

## References

- [Tauri Plugin Store Documentation](https://v2.tauri.app/plugin/store/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Design Document](../../../.kiro/specs/ai-tool-manager/design.md)
- [Requirements Document](../../../.kiro/specs/ai-tool-manager/requirements.md)
