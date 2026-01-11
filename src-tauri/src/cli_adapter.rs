use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// CLI Adapter definition for AI tools
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CLIAdapter {
    pub id: String,
    pub name: String,
    pub executable: String,
    pub detect_command: String,
    pub version_command: String,
    pub config_paths: HashMap<String, String>,
}

/// Result of tool detection
#[derive(Debug, Serialize, Deserialize)]
pub struct DetectionResult {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

/// Result of health check
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthCheckResult {
    pub tool_id: String,
    pub status: HealthStatus,
    pub version: Option<String>,
    pub errors: Vec<String>,
    pub suggestions: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum HealthStatus {
    Healthy,
    Unhealthy,
}

/// Get list of available CLI adapters
#[tauri::command]
pub fn get_available_adapters() -> Vec<CLIAdapter> {
    vec![
        CLIAdapter {
            id: "codex".to_string(),
            name: "OpenAI Codex CLI".to_string(),
            executable: "codex".to_string(),
            detect_command: "codex --version".to_string(),
            version_command: "codex --version".to_string(),
            config_paths: create_config_paths("codex"),
        },
        CLIAdapter {
            id: "claude-code".to_string(),
            name: "Claude Code".to_string(),
            executable: "claude".to_string(),
            detect_command: "claude --version".to_string(),
            version_command: "claude --version".to_string(),
            config_paths: create_config_paths("claude"),
        },
        CLIAdapter {
            id: "google-cli".to_string(),
            name: "Google AI CLI".to_string(),
            executable: "google-cli".to_string(),
            detect_command: "google-cli --version".to_string(),
            version_command: "google-cli --version".to_string(),
            config_paths: create_config_paths("google-cli"),
        },
    ]
}

/// Create platform-specific config paths
fn create_config_paths(tool_name: &str) -> HashMap<String, String> {
    let mut paths = HashMap::new();
    
    #[cfg(target_os = "windows")]
    {
        paths.insert(
            "windows".to_string(),
            format!("%APPDATA%\\{}\\config.json", tool_name),
        );
    }
    
    #[cfg(target_os = "macos")]
    {
        paths.insert(
            "macos".to_string(),
            format!("~/Library/Application Support/{}/config.json", tool_name),
        );
    }
    
    #[cfg(target_os = "linux")]
    {
        paths.insert(
            "linux".to_string(),
            format!("~/.config/{}/config.json", tool_name),
        );
    }

    // Add all platforms for cross-compilation
    if paths.is_empty() {
        paths.insert(
            "windows".to_string(),
            format!("%APPDATA%\\{}\\config.json", tool_name),
        );
        paths.insert(
            "macos".to_string(),
            format!("~/Library/Application Support/{}/config.json", tool_name),
        );
        paths.insert(
            "linux".to_string(),
            format!("~/.config/{}/config.json", tool_name),
        );
    }

    paths
}

/// Detect if a CLI tool is installed
#[tauri::command]
pub async fn detect_cli_tool(tool_id: String) -> Result<DetectionResult, String> {
    // Placeholder implementation
    // Actual implementation will execute the detect_command
    let adapters = get_available_adapters();
    let adapter = adapters.iter().find(|a| a.id == tool_id);

    match adapter {
        Some(_) => Ok(DetectionResult {
            installed: false,
            version: None,
            path: None,
        }),
        None => Err(format!("Unknown tool: {}", tool_id)),
    }
}

/// Run health check for a tool
#[tauri::command]
pub async fn run_health_check(tool_id: String) -> Result<HealthCheckResult, String> {
    let detection = detect_cli_tool(tool_id.clone()).await?;

    if !detection.installed {
        return Ok(HealthCheckResult {
            tool_id: tool_id.clone(),
            status: HealthStatus::Unhealthy,
            version: None,
            errors: vec![format!("{} is not installed", tool_id)],
            suggestions: vec![
                format!("Install {} using the appropriate package manager", tool_id),
                "Check the installation guide in the documentation".to_string(),
            ],
        });
    }

    Ok(HealthCheckResult {
        tool_id,
        status: HealthStatus::Healthy,
        version: detection.version,
        errors: vec![],
        suggestions: vec![],
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_available_adapters() {
        let adapters = get_available_adapters();
        assert!(!adapters.is_empty());
        assert!(adapters.iter().any(|a| a.id == "codex"));
        assert!(adapters.iter().any(|a| a.id == "claude-code"));
        assert!(adapters.iter().any(|a| a.id == "google-cli"));
    }

    #[test]
    fn test_health_status_serialization() {
        let status = HealthStatus::Healthy;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"Healthy\"");
    }
}
