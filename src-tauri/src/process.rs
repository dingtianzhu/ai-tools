use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};
use std::thread;

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
pub(crate) fn generate_pid() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    (duration.as_nanos() % u32::MAX as u128) as u32
}

/// Start a runtime process
#[tauri::command]
pub async fn start_runtime(
    runtime_id: String,
    executable_path: String,
    args: Vec<String>,
    working_dir: Option<String>,
) -> Result<u32, String> {
    // Parse runtime type from ID
    let parts: Vec<&str> = runtime_id.split('_').collect();
    if parts.is_empty() {
        return Err("Invalid runtime ID".to_string());
    }

    let runtime_type = parts[0];

    match runtime_type {
        "ollama" => start_ollama_runtime().await,
        "localai" => start_localai_runtime().await,
        "docker" => {
            if parts.len() >= 2 {
                start_docker_runtime(parts[1]).await
            } else {
                Err("Invalid Docker runtime ID".to_string())
            }
        }
        _ => {
            // Generic process start
            start_generic_runtime(executable_path, args, working_dir).await
        }
    }
}

/// Start Ollama runtime
async fn start_ollama_runtime() -> Result<u32, String> {
    let output = Command::new("ollama")
        .arg("serve")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start Ollama: {}", e))?;

    let pid = output.id();
    
    // Store process info
    let process_info = ProcessInfo {
        pid,
        tool_id: "ollama".to_string(),
        working_dir: String::new(),
        status: ProcessStatus::Running,
    };

    let mut registry = process_registry().lock().map_err(|e| e.to_string())?;
    registry.insert(pid, process_info);

    // Capture output in background
    if let Some(stdout) = output.stdout {
        let output_buffer = Arc::clone(&Arc::new(Mutex::new(String::new())));
        let _pid_clone = pid;
        thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(line) = line {
                    if let Ok(mut buf) = output_buffer.lock() {
                        buf.push_str(&line);
                        buf.push('\n');
                    }
                }
            }
        });
    }

    Ok(pid)
}

/// Start LocalAI runtime
async fn start_localai_runtime() -> Result<u32, String> {
    let output = Command::new("local-ai")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start LocalAI: {}", e))?;

    let pid = output.id();
    
    let process_info = ProcessInfo {
        pid,
        tool_id: "localai".to_string(),
        working_dir: String::new(),
        status: ProcessStatus::Running,
    };

    let mut registry = process_registry().lock().map_err(|e| e.to_string())?;
    registry.insert(pid, process_info);

    Ok(pid)
}

/// Start Docker container
async fn start_docker_runtime(container_id: &str) -> Result<u32, String> {
    let output = Command::new("docker")
        .args(&["start", container_id])
        .output()
        .map_err(|e| format!("Failed to start Docker container: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Docker start failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    // Return a pseudo-PID for Docker containers
    Ok(container_id.bytes().fold(0u32, |acc, b| acc.wrapping_add(b as u32)))
}

/// Start generic runtime
async fn start_generic_runtime(
    executable_path: String,
    args: Vec<String>,
    working_dir: Option<String>,
) -> Result<u32, String> {
    let mut command = Command::new(&executable_path);
    command.args(&args);
    
    if let Some(dir) = working_dir {
        command.current_dir(dir);
    }

    let output = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start process: {}", e))?;

    let pid = output.id();
    
    let process_info = ProcessInfo {
        pid,
        tool_id: executable_path,
        working_dir: String::new(),
        status: ProcessStatus::Running,
    };

    let mut registry = process_registry().lock().map_err(|e| e.to_string())?;
    registry.insert(pid, process_info);

    Ok(pid)
}

/// Stop a runtime process
#[tauri::command]
pub async fn stop_runtime(runtime_id: String) -> Result<(), String> {
    let parts: Vec<&str> = runtime_id.split('_').collect();
    if parts.is_empty() {
        return Err("Invalid runtime ID".to_string());
    }

    let runtime_type = parts[0];

    match runtime_type {
        "docker" => {
            if parts.len() >= 2 {
                stop_docker_runtime(parts[1]).await
            } else {
                Err("Invalid Docker runtime ID".to_string())
            }
        }
        _ => {
            // For other runtimes, we need to find the PID
            // This is a simplified implementation
            Err("Stopping non-Docker runtimes not yet implemented".to_string())
        }
    }
}

/// Stop Docker container
async fn stop_docker_runtime(container_id: &str) -> Result<(), String> {
    let output = Command::new("docker")
        .args(&["stop", container_id])
        .output()
        .map_err(|e| format!("Failed to stop Docker container: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Docker stop failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

/// Restart a runtime process
#[tauri::command]
pub async fn restart_runtime(runtime_id: String) -> Result<u32, String> {
    // Stop the runtime first
    if let Err(e) = stop_runtime(runtime_id.clone()).await {
        // If stop fails, it might already be stopped, continue anyway
        eprintln!("Warning: stop failed: {}", e);
    }

    // Wait a bit for cleanup
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

    // Start it again
    start_runtime(runtime_id, String::new(), vec![], None).await
}

/// Stream process output (placeholder for event-based streaming)
#[tauri::command]
pub async fn stream_process_output(pid: u32) -> Result<Vec<String>, String> {
    let output = process_output().lock().map_err(|e| e.to_string())?;
    
    if let Some(buf) = output.get(&pid) {
        Ok(buf.lines().map(|s| s.to_string()).collect())
    } else {
        Ok(vec![])
    }
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

#[cfg(test)]
#[path = "process_test.rs"]
mod process_test;
