use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use crate::cli_adapter::get_available_adapters;
use crate::error::AppError;

/// Configuration validation result
#[derive(Debug, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
}

/// Read tool configuration file
#[tauri::command]
pub async fn read_tool_config(tool_id: String) -> Result<String, String> {
    let config_path = get_config_path_impl(&tool_id)?;
    
    std::fs::read_to_string(&config_path)
        .map_err(|e| AppError::FileNotFound(format!("{}: {}", config_path, e)).to_string())
}

/// Write tool configuration file
#[tauri::command]
pub async fn write_tool_config(tool_id: String, content: String) -> Result<(), String> {
    // Validate before writing
    let validation = validate_config_impl(&tool_id, &content)?;
    if !validation.valid {
        return Err(format!("Invalid configuration: {:?}", validation.errors));
    }

    let config_path = get_config_path_impl(&tool_id)?;
    
    // Create parent directory if needed
    if let Some(parent) = PathBuf::from(&config_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| AppError::IoError(e.to_string()).to_string())?;
    }

    std::fs::write(&config_path, content)
        .map_err(|e| AppError::IoError(e.to_string()).to_string())
}

/// Validate configuration content
#[tauri::command]
pub async fn validate_config(tool_id: String, content: String) -> Result<ValidationResult, String> {
    validate_config_impl(&tool_id, &content)
}

fn validate_config_impl(_tool_id: &str, content: &str) -> Result<ValidationResult, String> {
    let mut errors = Vec::new();

    // Check if content is valid JSON
    if let Err(e) = serde_json::from_str::<serde_json::Value>(content) {
        errors.push(format!("Invalid JSON: {}", e));
        return Ok(ValidationResult {
            valid: false,
            errors,
        });
    }

    // Additional validation can be added here based on tool-specific schemas

    Ok(ValidationResult {
        valid: errors.is_empty(),
        errors,
    })
}

/// Get configuration file path for a tool
#[tauri::command]
pub fn get_config_path(tool_id: String) -> Result<String, String> {
    get_config_path_impl(&tool_id)
}

fn get_config_path_impl(tool_id: &str) -> Result<String, String> {
    let adapters = get_available_adapters();
    let adapter = adapters.iter().find(|a| a.id == tool_id);

    match adapter {
        Some(a) => {
            let platform = get_current_platform();
            a.config_paths
                .get(&platform)
                .cloned()
                .ok_or_else(|| format!("No config path for platform: {}", platform))
        }
        None => Err(format!("Unknown tool: {}", tool_id)),
    }
}

fn get_current_platform() -> String {
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    
    #[cfg(target_os = "linux")]
    return "linux".to_string();
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    return "unknown".to_string();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_valid_json() {
        let result = validate_config_impl("codex", r#"{"key": "value"}"#).unwrap();
        assert!(result.valid);
        assert!(result.errors.is_empty());
    }

    #[test]
    fn test_validate_invalid_json() {
        let result = validate_config_impl("codex", "not json").unwrap();
        assert!(!result.valid);
        assert!(!result.errors.is_empty());
    }
}
