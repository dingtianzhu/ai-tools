use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

use crate::error::AppError;

/// Process information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub tool_id: String,
    pub working_dir: String,
    pub status: ProcessStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProcessStatus {
    Running,
    Stopped,
    Error,
}

/// Global process registry
fn process_registry() -> &'static Mutex<HashMap<u32, ProcessInfo>> {
    static REGISTRY: OnceLock<Mutex<HashMap<u32, ProcessInfo>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Output buffer for processes
fn process_output() -> &'static Mutex<HashMap<u32, String>> {
    static OUTPUT: OnceLock<Mutex<HashMap<u32, String>>> = OnceLock::new();
    OUTPUT.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Spawn a CLI process for an AI tool
#[tauri::command]
pub async fn spawn_cli_process(
    tool_id: String,
    working_dir: String,
    _args: Vec<String>,
) -> Result<u32, String> {
    // For now, return a placeholder PID
    // Actual implementation will use tauri_plugin_shell
    let pid = generate_pid();
    
    let process_info = ProcessInfo {
        pid,
        tool_id,
        working_dir,
        status: ProcessStatus::Running,
    };

    let mut registry = process_registry().lock().map_err(|e| e.to_string())?;
    registry.insert(pid, process_info);

    let mut output = process_output().lock().map_err(|e| e.to_string())?;
    output.insert(pid, String::new());

    Ok(pid)
}

/// Send input to a running process
#[tauri::command]
pub async fn send_to_process(pid: u32, input: String) -> Result<(), String> {
    let registry = process_registry().lock().map_err(|e| e.to_string())?;
    
    if !registry.contains_key(&pid) {
        return Err(AppError::ProcessError {
            pid,
            message: "Process not found".to_string(),
        }.to_string());
    }

    // Store input as simulated output for now
    let mut output = process_output().lock().map_err(|e| e.to_string())?;
    if let Some(buf) = output.get_mut(&pid) {
        buf.push_str(&format!("Input: {}\n", input));
    }

    Ok(())
}

/// Kill a running process
#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    let mut registry = process_registry().lock().map_err(|e| e.to_string())?;
    
    if let Some(process) = registry.get_mut(&pid) {
        process.status = ProcessStatus::Stopped;
        Ok(())
    } else {
        Err(AppError::ProcessError {
            pid,
            message: "Process not found".to_string(),
        }.to_string())
    }
}

/// Get output from a process
#[tauri::command]
pub fn get_process_output(pid: u32) -> Result<String, String> {
    let output = process_output().lock().map_err(|e| e.to_string())?;
    
    output.get(&pid)
        .cloned()
        .ok_or_else(|| AppError::ProcessError {
            pid,
            message: "Process output not found".to_string(),
        }.to_string())
}

/// Generate a unique PID (placeholder implementation)
fn generate_pid() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    (duration.as_nanos() % u32::MAX as u128) as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_status_serialization() {
        let status = ProcessStatus::Running;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"Running\"");
    }
}
