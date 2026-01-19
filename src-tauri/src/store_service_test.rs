// Integration tests for store_service
// Tests the full flow of saving and loading data through Tauri Plugin Store

#[cfg(test)]
mod integration_tests {
    use crate::store_service::{SettingsData, ProjectsData, RuntimesData};

    #[test]
    fn test_settings_data_round_trip() {
        // Create settings data
        let settings = SettingsData::default();
        
        // Serialize to JSON
        let json = serde_json::to_string(&settings).unwrap();
        
        // Deserialize back
        let deserialized: SettingsData = serde_json::from_str(&json).unwrap();
        
        // Verify all fields match
        assert_eq!(settings.version, deserialized.version);
        assert_eq!(settings.theme, deserialized.theme);
        assert_eq!(settings.language, deserialized.language);
        assert_eq!(settings.editor_font_size, deserialized.editor_font_size);
        assert_eq!(settings.auto_save, deserialized.auto_save);
        assert_eq!(settings.panel_sizes.navigation, deserialized.panel_sizes.navigation);
        assert_eq!(settings.panel_sizes.main, deserialized.panel_sizes.main);
        assert_eq!(settings.panel_sizes.context, deserialized.panel_sizes.context);
    }

    #[test]
    fn test_projects_data_round_trip() {
        // Create projects data
        let projects = ProjectsData::default();
        
        // Serialize to JSON
        let json = serde_json::to_string(&projects).unwrap();
        
        // Deserialize back
        let deserialized: ProjectsData = serde_json::from_str(&json).unwrap();
        
        // Verify all fields match
        assert_eq!(projects.version, deserialized.version);
        assert_eq!(projects.projects.len(), deserialized.projects.len());
        assert_eq!(projects.recent_projects.len(), deserialized.recent_projects.len());
    }

    #[test]
    fn test_runtimes_data_round_trip() {
        // Create runtimes data
        let runtimes = RuntimesData::default();
        
        // Serialize to JSON
        let json = serde_json::to_string(&runtimes).unwrap();
        
        // Deserialize back
        let deserialized: RuntimesData = serde_json::from_str(&json).unwrap();
        
        // Verify all fields match
        assert_eq!(runtimes.version, deserialized.version);
        assert_eq!(runtimes.custom_runtimes.len(), deserialized.custom_runtimes.len());
        assert_eq!(runtimes.last_scan, deserialized.last_scan);
    }

    #[test]
    fn test_settings_with_custom_values() {
        let mut settings = SettingsData::default();
        settings.theme = "dark".to_string();
        settings.editor_font_size = 16;
        settings.auto_save = false;
        settings.keyboard_shortcuts.insert("test".to_string(), "Ctrl+T".to_string());
        settings.token_limits.insert("test-model".to_string(), 16384);
        
        // Serialize and deserialize
        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: SettingsData = serde_json::from_str(&json).unwrap();
        
        // Verify custom values
        assert_eq!(deserialized.theme, "dark");
        assert_eq!(deserialized.editor_font_size, 16);
        assert_eq!(deserialized.auto_save, false);
        assert_eq!(deserialized.keyboard_shortcuts.get("test"), Some(&"Ctrl+T".to_string()));
        assert_eq!(deserialized.token_limits.get("test-model"), Some(&16384));
    }

    #[test]
    fn test_json_field_naming() {
        // Test that camelCase fields are properly serialized
        let settings = SettingsData::default();
        let json = serde_json::to_value(&settings).unwrap();
        
        // Check that JSON uses camelCase
        assert!(json.get("editorFontSize").is_some());
        assert!(json.get("autoSave").is_some());
        assert!(json.get("panelSizes").is_some());
        assert!(json.get("keyboardShortcuts").is_some());
        assert!(json.get("tokenLimits").is_some());
        
        // Check that snake_case is NOT used
        assert!(json.get("editor_font_size").is_none());
        assert!(json.get("auto_save").is_none());
    }
}
