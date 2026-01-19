// Store Service - Tauri Plugin Store integration for configuration persistence
// Provides commands for reading and writing settings, projects, and runtimes to JSON files

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

/// Settings data structure (settings.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsData {
    pub version: u32,
    pub theme: String,
    pub language: String,
    #[serde(rename = "editorFontSize")]
    pub editor_font_size: u32,
    #[serde(rename = "autoSave")]
    pub auto_save: bool,
    #[serde(rename = "panelSizes")]
    pub panel_sizes: PanelSizes,
    #[serde(rename = "keyboardShortcuts")]
    pub keyboard_shortcuts: std::collections::HashMap<String, String>,
    #[serde(rename = "tokenLimits")]
    pub token_limits: std::collections::HashMap<String, u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PanelSizes {
    pub navigation: u32,
    pub main: u32,
    pub context: u32,
}

impl Default for SettingsData {
    fn default() -> Self {
        let mut keyboard_shortcuts = std::collections::HashMap::new();
        keyboard_shortcuts.insert("new_session".to_string(), "Ctrl+N".to_string());
        keyboard_shortcuts.insert("search".to_string(), "Ctrl+F".to_string());
        keyboard_shortcuts.insert("command_palette".to_string(), "Ctrl+K".to_string());

        let mut token_limits = std::collections::HashMap::new();
        token_limits.insert("gpt-4".to_string(), 8192);
        token_limits.insert("gpt-3.5-turbo".to_string(), 4096);

        Self {
            version: 1,
            theme: "system".to_string(),
            language: "zh-CN".to_string(),
            editor_font_size: 14,
            auto_save: true,
            panel_sizes: PanelSizes {
                navigation: 250,
                main: 600,
                context: 300,
            },
            keyboard_shortcuts,
            token_limits,
        }
    }
}

/// Projects data structure (projects.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectsData {
    pub version: u32,
    pub projects: Vec<Value>,
    #[serde(rename = "recentProjects")]
    pub recent_projects: Vec<String>,
}

impl Default for ProjectsData {
    fn default() -> Self {
        Self {
            version: 1,
            projects: Vec::new(),
            recent_projects: Vec::new(),
        }
    }
}

/// Runtimes data structure (runtimes.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimesData {
    pub version: u32,
    #[serde(rename = "customRuntimes")]
    pub custom_runtimes: Vec<Value>,
    #[serde(rename = "lastScan")]
    pub last_scan: u64,
}

impl Default for RuntimesData {
    fn default() -> Self {
        Self {
            version: 1,
            custom_runtimes: Vec::new(),
            last_scan: 0,
        }
    }
}

/// Load settings from settings.json
#[tauri::command]
pub async fn load_settings(app: AppHandle) -> Result<SettingsData, String> {
    let store = app
        .store("settings.json")
        .map_err(|e| format!("Failed to access settings store: {}", e))?;

    // Try to get the entire settings object
    match store.get("settings") {
        Some(value) => {
            serde_json::from_value(value.clone())
                .map_err(|e| format!("Failed to parse settings: {}", e))
        }
        None => {
            // Return default settings if not found
            Ok(SettingsData::default())
        }
    }
}

/// Save settings to settings.json
#[tauri::command]
pub async fn save_settings(app: AppHandle, settings: SettingsData) -> Result<(), String> {
    let store = app
        .store("settings.json")
        .map_err(|e| format!("Failed to access settings store: {}", e))?;

    let value = serde_json::to_value(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    store.set("settings", value);

    store
        .save()
        .map_err(|e| format!("Failed to persist settings: {}", e))?;

    Ok(())
}

/// Load projects from projects.json
#[tauri::command]
pub async fn load_projects(app: AppHandle) -> Result<ProjectsData, String> {
    let store = app
        .store("projects.json")
        .map_err(|e| format!("Failed to access projects store: {}", e))?;

    match store.get("projects") {
        Some(value) => {
            serde_json::from_value(value.clone())
                .map_err(|e| format!("Failed to parse projects: {}", e))
        }
        None => {
            // Return default projects if not found
            Ok(ProjectsData::default())
        }
    }
}

/// Save projects to projects.json
#[tauri::command]
pub async fn save_projects(app: AppHandle, projects: ProjectsData) -> Result<(), String> {
    let store = app
        .store("projects.json")
        .map_err(|e| format!("Failed to access projects store: {}", e))?;

    let value = serde_json::to_value(&projects)
        .map_err(|e| format!("Failed to serialize projects: {}", e))?;

    store.set("projects", value);

    store
        .save()
        .map_err(|e| format!("Failed to persist projects: {}", e))?;

    Ok(())
}

/// Load runtimes from runtimes.json
#[tauri::command]
pub async fn load_runtimes(app: AppHandle) -> Result<RuntimesData, String> {
    let store = app
        .store("runtimes.json")
        .map_err(|e| format!("Failed to access runtimes store: {}", e))?;

    match store.get("runtimes") {
        Some(value) => {
            serde_json::from_value(value.clone())
                .map_err(|e| format!("Failed to parse runtimes: {}", e))
        }
        None => {
            // Return default runtimes if not found
            Ok(RuntimesData::default())
        }
    }
}

/// Save runtimes to runtimes.json
#[tauri::command]
pub async fn save_runtimes(app: AppHandle, runtimes: RuntimesData) -> Result<(), String> {
    let store = app
        .store("runtimes.json")
        .map_err(|e| format!("Failed to access runtimes store: {}", e))?;

    let value = serde_json::to_value(&runtimes)
        .map_err(|e| format!("Failed to serialize runtimes: {}", e))?;

    store.set("runtimes", value);

    store
        .save()
        .map_err(|e| format!("Failed to persist runtimes: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_settings_default() {
        let settings = SettingsData::default();
        assert_eq!(settings.version, 1);
        assert_eq!(settings.theme, "system");
        assert_eq!(settings.language, "zh-CN");
        assert_eq!(settings.editor_font_size, 14);
        assert!(settings.auto_save);
        assert_eq!(settings.panel_sizes.navigation, 250);
        assert_eq!(settings.panel_sizes.main, 600);
        assert_eq!(settings.panel_sizes.context, 300);
    }

    #[test]
    fn test_projects_default() {
        let projects = ProjectsData::default();
        assert_eq!(projects.version, 1);
        assert!(projects.projects.is_empty());
        assert!(projects.recent_projects.is_empty());
    }

    #[test]
    fn test_runtimes_default() {
        let runtimes = RuntimesData::default();
        assert_eq!(runtimes.version, 1);
        assert!(runtimes.custom_runtimes.is_empty());
        assert_eq!(runtimes.last_scan, 0);
    }

    #[test]
    fn test_settings_serialization() {
        let settings = SettingsData::default();
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: SettingsData = serde_json::from_str(&json).unwrap();
        assert_eq!(settings.version, deserialized.version);
        assert_eq!(settings.theme, deserialized.theme);
    }
}
