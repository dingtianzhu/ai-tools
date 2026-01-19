use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use sysinfo::System;

/// Detected AI runtime information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedRuntime {
    pub id: String,
    pub name: String,
    pub runtime_type: String, // "ollama", "localai", "python", "docker", "custom"
    pub executable_path: String,
    pub version: Option<String>,
    pub auto_detected: bool,
}

/// Runtime status information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeStatus {
    pub status: String, // "running", "stopped", "error"
    pub version: Option<String>,
    pub uptime_seconds: Option<u64>,
    pub port: Option<u16>,
    pub error: Option<String>,
}

/// Resource usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceUsage {
    pub memory_mb: f64,
    pub vram_mb: Option<f64>,
    pub cpu_percent: f64,
}

/// Runtime information from validation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuntimeInfo {
    pub valid: bool,
    pub version: Option<String>,
    pub capabilities: Vec<String>,
}

/// Runtime detector configuration
struct RuntimeDetector {
    name: &'static str,
    runtime_type: &'static str,
    executables: &'static [&'static str],
    version_command: &'static [&'static str],
    default_port: Option<u16>,
}

const RUNTIME_DETECTORS: &[RuntimeDetector] = &[
    RuntimeDetector {
        name: "Ollama",
        runtime_type: "ollama",
        executables: &["ollama"],
        version_command: &["ollama", "--version"],
        default_port: Some(11434),
    },
    RuntimeDetector {
        name: "LocalAI",
        runtime_type: "localai",
        executables: &["local-ai", "localai"],
        version_command: &["local-ai", "--version"],
        default_port: Some(8080),
    },
    RuntimeDetector {
        name: "Python",
        runtime_type: "python",
        executables: &["python3", "python"],
        version_command: &["python3", "--version"],
        default_port: None,
    },
    RuntimeDetector {
        name: "Node.js",
        runtime_type: "node",
        executables: &["node"],
        version_command: &["node", "--version"],
        default_port: None,
    },
    RuntimeDetector {
        name: "Docker",
        runtime_type: "docker",
        executables: &["docker"],
        version_command: &["docker", "--version"],
        default_port: None,
    },
];

/// Scan system for AI runtimes
#[tauri::command]
pub async fn scan_runtimes() -> Result<Vec<DetectedRuntime>, String> {
    let mut runtimes = Vec::new();

    for detector in RUNTIME_DETECTORS {
        if let Some(runtime) = detect_runtime(detector).await {
            runtimes.push(runtime);
        }
    }

    // Also scan for Docker containers running AI services
    if let Ok(docker_runtimes) = scan_docker_containers().await {
        runtimes.extend(docker_runtimes);
    }

    Ok(runtimes)
}

/// Detect a specific runtime
async fn detect_runtime(detector: &RuntimeDetector) -> Option<DetectedRuntime> {
    for executable in detector.executables {
        if let Some(path) = find_executable(executable) {
            let version = get_version(&path, detector.version_command).await;
            
            return Some(DetectedRuntime {
                id: format!("{}_{}", detector.runtime_type, executable),
                name: detector.name.to_string(),
                runtime_type: detector.runtime_type.to_string(),
                executable_path: path,
                version,
                auto_detected: true,
            });
        }
    }
    None
}

/// Find executable in PATH
fn find_executable(name: &str) -> Option<String> {
    // Try using 'which' on Unix or 'where' on Windows
    #[cfg(unix)]
    let command = "which";
    #[cfg(windows)]
    let command = "where";

    let output = Command::new(command)
        .arg(name)
        .output()
        .ok()?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout)
            .lines()
            .next()?
            .trim()
            .to_string();
        
        if !path.is_empty() {
            return Some(path);
        }
    }

    None
}

/// Get version from executable
async fn get_version(executable_path: &str, version_args: &[&str]) -> Option<String> {
    if version_args.is_empty() {
        return None;
    }

    let output = Command::new(executable_path)
        .args(&version_args[1..]) // Skip the executable name itself
        .output()
        .ok()?;

    if output.status.success() {
        let version_output = String::from_utf8_lossy(&output.stdout);
        let version = version_output
            .lines()
            .next()?
            .trim()
            .to_string();
        
        if !version.is_empty() {
            return Some(version);
        }
    }

    None
}

/// Scan for Docker containers running AI services
async fn scan_docker_containers() -> Result<Vec<DetectedRuntime>, String> {
    let output = Command::new("docker")
        .args(&["ps", "--format", "{{.ID}}|{{.Image}}|{{.Names}}"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    let mut runtimes = Vec::new();
    let output_str = String::from_utf8_lossy(&output.stdout);

    for line in output_str.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 3 {
            let container_id = parts[0];
            let image = parts[1];
            let name = parts[2];

            // Check if it's an AI service container
            if is_ai_container(image) {
                runtimes.push(DetectedRuntime {
                    id: format!("docker_{}", container_id),
                    name: format!("Docker: {}", name),
                    runtime_type: "docker".to_string(),
                    executable_path: format!("docker:{}", container_id),
                    version: Some(image.to_string()),
                    auto_detected: true,
                });
            }
        }
    }

    Ok(runtimes)
}

/// Check if a Docker image is an AI service
pub(crate) fn is_ai_container(image: &str) -> bool {
    let ai_images = ["ollama", "localai", "text-generation", "stable-diffusion"];
    ai_images.iter().any(|&ai| image.to_lowercase().contains(ai))
}

/// Get runtime status
#[tauri::command]
pub async fn get_runtime_status(runtime_id: String) -> Result<RuntimeStatus, String> {
    // Parse runtime type from ID
    let parts: Vec<&str> = runtime_id.split('_').collect();
    if parts.is_empty() {
        return Err("Invalid runtime ID".to_string());
    }

    let runtime_type = parts[0];

    match runtime_type {
        "ollama" => check_ollama_status().await,
        "localai" => check_localai_status().await,
        "docker" => {
            if parts.len() >= 2 {
                check_docker_status(parts[1]).await
            } else {
                Err("Invalid Docker runtime ID".to_string())
            }
        }
        "python" | "node" => {
            // These are interpreters, not services
            Ok(RuntimeStatus {
                status: "stopped".to_string(),
                version: None,
                uptime_seconds: None,
                port: None,
                error: None,
            })
        }
        _ => Err(format!("Unknown runtime type: {}", runtime_type)),
    }
}

/// Check Ollama status
async fn check_ollama_status() -> Result<RuntimeStatus, String> {
    // Try to connect to Ollama API
    match reqwest::get("http://localhost:11434/api/version").await {
        Ok(response) if response.status().is_success() => {
            let version = response.text().await.ok();
            Ok(RuntimeStatus {
                status: "running".to_string(),
                version,
                uptime_seconds: None,
                port: Some(11434),
                error: None,
            })
        }
        Ok(_) => Ok(RuntimeStatus {
            status: "error".to_string(),
            version: None,
            uptime_seconds: None,
            port: Some(11434),
            error: Some("Ollama API returned error".to_string()),
        }),
        Err(_) => Ok(RuntimeStatus {
            status: "stopped".to_string(),
            version: None,
            uptime_seconds: None,
            port: Some(11434),
            error: None,
        }),
    }
}

/// Check LocalAI status
async fn check_localai_status() -> Result<RuntimeStatus, String> {
    // Try to connect to LocalAI API
    match reqwest::get("http://localhost:8080/readyz").await {
        Ok(response) if response.status().is_success() => Ok(RuntimeStatus {
            status: "running".to_string(),
            version: None,
            uptime_seconds: None,
            port: Some(8080),
            error: None,
        }),
        Ok(_) => Ok(RuntimeStatus {
            status: "error".to_string(),
            version: None,
            uptime_seconds: None,
            port: Some(8080),
            error: Some("LocalAI API returned error".to_string()),
        }),
        Err(_) => Ok(RuntimeStatus {
            status: "stopped".to_string(),
            version: None,
            uptime_seconds: None,
            port: Some(8080),
            error: None,
        }),
    }
}

/// Check Docker container status
async fn check_docker_status(container_id: &str) -> Result<RuntimeStatus, String> {
    let output = Command::new("docker")
        .args(&["inspect", "--format", "{{.State.Status}}", container_id])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let status = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(RuntimeStatus {
            status: if status == "running" {
                "running".to_string()
            } else {
                "stopped".to_string()
            },
            version: None,
            uptime_seconds: None,
            port: None,
            error: None,
        })
    } else {
        Err("Failed to inspect Docker container".to_string())
    }
}

/// Estimate resource usage for a runtime
#[tauri::command]
pub async fn estimate_resource_usage(runtime_id: String) -> Result<ResourceUsage, String> {
    let parts: Vec<&str> = runtime_id.split('_').collect();
    if parts.is_empty() {
        return Err("Invalid runtime ID".to_string());
    }

    let runtime_type = parts[0];

    match runtime_type {
        "ollama" => estimate_process_usage("ollama").await,
        "localai" => estimate_process_usage("local-ai").await,
        "docker" => {
            if parts.len() >= 2 {
                estimate_docker_usage(parts[1]).await
            } else {
                Err("Invalid Docker runtime ID".to_string())
            }
        }
        _ => Ok(ResourceUsage {
            memory_mb: 0.0,
            vram_mb: None,
            cpu_percent: 0.0,
        }),
    }
}

/// Estimate resource usage for a process by name
async fn estimate_process_usage(process_name: &str) -> Result<ResourceUsage, String> {
    let mut system = System::new_all();
    system.refresh_all();

    let mut total_memory = 0u64;
    let mut total_cpu = 0.0;

    for (_pid, process) in system.processes() {
        if process.name().to_lowercase().contains(&process_name.to_lowercase()) {
            total_memory += process.memory();
            total_cpu += process.cpu_usage();
        }
    }

    Ok(ResourceUsage {
        memory_mb: total_memory as f64 / 1024.0 / 1024.0,
        vram_mb: None, // VRAM detection requires platform-specific APIs
        cpu_percent: total_cpu as f64,
    })
}

/// Estimate resource usage for a Docker container
async fn estimate_docker_usage(container_id: &str) -> Result<ResourceUsage, String> {
    let output = Command::new("docker")
        .args(&[
            "stats",
            "--no-stream",
            "--format",
            "{{.MemUsage}}|{{.CPUPerc}}",
            container_id,
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Failed to get Docker stats".to_string());
    }

    let stats = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stats.trim().split('|').collect();

    if parts.len() >= 2 {
        // Parse memory (format: "123.4MiB / 2GiB")
        let memory_str = parts[0].split('/').next().unwrap_or("0").trim();
        let memory_mb = parse_memory_string(memory_str);

        // Parse CPU (format: "12.34%")
        let cpu_str = parts[1].trim().trim_end_matches('%');
        let cpu_percent = cpu_str.parse::<f64>().unwrap_or(0.0);

        Ok(ResourceUsage {
            memory_mb,
            vram_mb: None,
            cpu_percent,
        })
    } else {
        Err("Failed to parse Docker stats".to_string())
    }
}

/// Parse memory string (e.g., "123.4MiB" or "1.2GiB")
pub(crate) fn parse_memory_string(mem_str: &str) -> f64 {
    let mem_str = mem_str.trim();
    
    if mem_str.ends_with("GiB") {
        let value = mem_str.trim_end_matches("GiB").parse::<f64>().unwrap_or(0.0);
        value * 1024.0
    } else if mem_str.ends_with("MiB") {
        mem_str.trim_end_matches("MiB").parse::<f64>().unwrap_or(0.0)
    } else if mem_str.ends_with("KiB") {
        let value = mem_str.trim_end_matches("KiB").parse::<f64>().unwrap_or(0.0);
        value / 1024.0
    } else {
        0.0
    }
}

/// Validate a runtime path
#[tauri::command]
pub async fn validate_runtime_path(path: String) -> Result<RuntimeInfo, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Ok(RuntimeInfo {
            valid: false,
            version: None,
            capabilities: vec![],
        });
    }

    // Try to get version
    let version = get_version(&path, &[&path, "--version"]).await;

    // Determine capabilities based on executable name
    let capabilities = determine_capabilities(&path);

    Ok(RuntimeInfo {
        valid: true,
        version,
        capabilities,
    })
}

/// Determine capabilities based on executable path
pub(crate) fn determine_capabilities(path: &str) -> Vec<String> {
    let path_lower = path.to_lowercase();
    let mut capabilities = Vec::new();

    if path_lower.contains("ollama") {
        capabilities.extend(vec![
            "chat".to_string(),
            "embeddings".to_string(),
            "model_management".to_string(),
        ]);
    } else if path_lower.contains("localai") {
        capabilities.extend(vec![
            "chat".to_string(),
            "embeddings".to_string(),
            "text_to_speech".to_string(),
            "speech_to_text".to_string(),
        ]);
    } else if path_lower.contains("python") {
        capabilities.extend(vec![
            "scripting".to_string(),
            "ml_frameworks".to_string(),
        ]);
    } else if path_lower.contains("node") {
        capabilities.extend(vec![
            "scripting".to_string(),
            "web_apis".to_string(),
        ]);
    }

    capabilities
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_memory_string() {
        assert_eq!(parse_memory_string("123.4MiB"), 123.4);
        assert_eq!(parse_memory_string("1.5GiB"), 1536.0);
        assert_eq!(parse_memory_string("512KiB"), 0.5);
    }

    #[test]
    fn test_is_ai_container() {
        assert!(is_ai_container("ollama/ollama:latest"));
        assert!(is_ai_container("localai/localai:v1.0"));
        assert!(!is_ai_container("nginx:latest"));
    }

    #[test]
    fn test_determine_capabilities() {
        let caps = determine_capabilities("/usr/bin/ollama");
        assert!(caps.contains(&"chat".to_string()));
        assert!(caps.contains(&"embeddings".to_string()));
    }
}

#[cfg(test)]
#[path = "runtime_monitor_test.rs"]
mod runtime_monitor_test;
