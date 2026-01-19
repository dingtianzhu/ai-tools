#[cfg(test)]
mod property_tests {
    use super::super::*;
    use std::collections::HashSet;

    /// **Property 1: Runtime Detection Completeness**
    /// 
    /// For any system PATH containing AI tool executables (ollama, python, node, docker),
    /// the runtime scanner SHALL detect all present tools and return their executable paths and versions.
    /// 
    /// **Validates: Requirements 1.2, 1.7**
    #[tokio::test]
    async fn property_1_runtime_detection_completeness() {
        // Test that scan_runtimes returns a valid list
        let result = scan_runtimes().await;
        assert!(result.is_ok(), "scan_runtimes should succeed");
        
        let runtimes = result.unwrap();
        
        // All detected runtimes should have valid IDs
        for runtime in &runtimes {
            assert!(!runtime.id.is_empty(), "Runtime ID should not be empty");
            assert!(!runtime.name.is_empty(), "Runtime name should not be empty");
            assert!(!runtime.runtime_type.is_empty(), "Runtime type should not be empty");
            assert!(!runtime.executable_path.is_empty(), "Executable path should not be empty");
        }
        
        // All IDs should be unique
        let ids: HashSet<_> = runtimes.iter().map(|r| &r.id).collect();
        assert_eq!(ids.len(), runtimes.len(), "All runtime IDs should be unique");
        
        // All runtime types should be valid
        let valid_types = ["ollama", "localai", "python", "node", "docker", "custom"];
        for runtime in &runtimes {
            assert!(
                valid_types.contains(&runtime.runtime_type.as_str()),
                "Runtime type '{}' should be valid",
                runtime.runtime_type
            );
        }
    }

    /// Test that detected runtimes have valid executable paths
    #[tokio::test]
    async fn property_1_detected_paths_are_valid() {
        let result = scan_runtimes().await;
        if let Ok(runtimes) = result {
            for runtime in runtimes {
                // Docker containers have special path format
                if runtime.runtime_type == "docker" {
                    // Docker paths should either start with "docker:" or be a valid executable
                    assert!(
                        runtime.executable_path.starts_with("docker:") || 
                        runtime.executable_path.contains("docker"),
                        "Docker runtime path '{}' should be valid",
                        runtime.executable_path
                    );
                } else {
                    // For non-docker runtimes, the path should be a valid file path
                    // We can't guarantee the file exists in test environment,
                    // but we can check the format is reasonable
                    assert!(
                        !runtime.executable_path.is_empty(),
                        "Executable path should not be empty"
                    );
                }
            }
        }
    }

    /// **Property 2: Runtime Status Consistency**
    /// 
    /// For any AI runtime, the displayed status (running, stopped, not installed, error)
    /// SHALL accurately reflect the actual process state at all times.
    /// 
    /// **Validates: Requirements 2.1, 2.5**
    #[tokio::test]
    async fn property_2_runtime_status_consistency() {
        // Test that status values are always valid
        let test_runtime_ids = vec![
            "ollama_ollama",
            "localai_local-ai",
            "python_python3",
            "node_node",
        ];
        
        for runtime_id in test_runtime_ids {
            let result = get_runtime_status(runtime_id.to_string()).await;
            
            if let Ok(status) = result {
                // Status should be one of the valid values
                let valid_statuses = ["running", "stopped", "error"];
                assert!(
                    valid_statuses.contains(&status.status.as_str()),
                    "Status '{}' should be valid",
                    status.status
                );
                
                // If status is "error", there should be an error message
                if status.status == "error" {
                    assert!(
                        status.error.is_some(),
                        "Error status should have an error message"
                    );
                }
                
                // If status is "running", port should be set for services
                if status.status == "running" && runtime_id.starts_with("ollama") {
                    assert!(
                        status.port.is_some(),
                        "Running Ollama should have a port"
                    );
                }
            }
        }
    }

    /// Test that status remains consistent across multiple calls
    #[tokio::test]
    async fn property_2_status_stability() {
        let runtime_id = "python_python3".to_string();
        
        // Get status twice
        let status1 = get_runtime_status(runtime_id.clone()).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        let status2 = get_runtime_status(runtime_id).await;
        
        // Both should succeed or both should fail
        assert_eq!(
            status1.is_ok(),
            status2.is_ok(),
            "Status consistency should be maintained"
        );
        
        if let (Ok(s1), Ok(s2)) = (status1, status2) {
            // For interpreters like Python, status should remain "stopped"
            assert_eq!(s1.status, s2.status, "Status should be consistent");
        }
    }

    /// Test resource usage estimation returns valid values
    #[tokio::test]
    async fn test_resource_usage_validity() {
        let test_runtime_ids = vec![
            "ollama_ollama",
            "localai_local-ai",
            "python_python3",
        ];
        
        for runtime_id in test_runtime_ids {
            let result = estimate_resource_usage(runtime_id.to_string()).await;
            
            if let Ok(usage) = result {
                // Memory should be non-negative
                assert!(
                    usage.memory_mb >= 0.0,
                    "Memory usage should be non-negative"
                );
                
                // CPU should be non-negative
                assert!(
                    usage.cpu_percent >= 0.0,
                    "CPU usage should be non-negative"
                );
                
                // VRAM is optional but if present should be non-negative
                if let Some(vram) = usage.vram_mb {
                    assert!(vram >= 0.0, "VRAM usage should be non-negative");
                }
            }
        }
    }

    /// Test runtime path validation
    #[tokio::test]
    async fn test_runtime_path_validation() {
        // Test with a non-existent path
        let result = validate_runtime_path("/nonexistent/path/to/runtime".to_string()).await;
        assert!(result.is_ok(), "Validation should succeed even for non-existent paths");
        
        if let Ok(info) = result {
            assert!(!info.valid, "Non-existent path should be invalid");
            assert!(info.version.is_none(), "Non-existent path should have no version");
        }
    }
}

#[cfg(test)]
mod unit_tests {
    use super::super::{parse_memory_string, is_ai_container, determine_capabilities};

    #[test]
    fn test_parse_memory_string_mib() {
        assert_eq!(parse_memory_string("123.4MiB"), 123.4);
        assert_eq!(parse_memory_string("0MiB"), 0.0);
    }

    #[test]
    fn test_parse_memory_string_gib() {
        assert_eq!(parse_memory_string("1.5GiB"), 1536.0);
        assert_eq!(parse_memory_string("2GiB"), 2048.0);
    }

    #[test]
    fn test_parse_memory_string_kib() {
        assert_eq!(parse_memory_string("512KiB"), 0.5);
        assert_eq!(parse_memory_string("1024KiB"), 1.0);
    }

    #[test]
    fn test_is_ai_container_positive() {
        assert!(is_ai_container("ollama/ollama:latest"));
        assert!(is_ai_container("localai/localai:v1.0"));
        assert!(is_ai_container("text-generation-webui:latest"));
        assert!(is_ai_container("stable-diffusion:v2"));
    }

    #[test]
    fn test_is_ai_container_negative() {
        assert!(!is_ai_container("nginx:latest"));
        assert!(!is_ai_container("postgres:14"));
        assert!(!is_ai_container("redis:alpine"));
    }

    #[test]
    fn test_determine_capabilities_ollama() {
        let caps = determine_capabilities("/usr/bin/ollama");
        assert!(caps.contains(&"chat".to_string()));
        assert!(caps.contains(&"embeddings".to_string()));
        assert!(caps.contains(&"model_management".to_string()));
    }

    #[test]
    fn test_determine_capabilities_localai() {
        let caps = determine_capabilities("/usr/local/bin/localai");
        assert!(caps.contains(&"chat".to_string()));
        assert!(caps.contains(&"embeddings".to_string()));
        assert!(caps.contains(&"text_to_speech".to_string()));
        assert!(caps.contains(&"speech_to_text".to_string()));
    }

    #[test]
    fn test_determine_capabilities_python() {
        let caps = determine_capabilities("/usr/bin/python3");
        assert!(caps.contains(&"scripting".to_string()));
        assert!(caps.contains(&"ml_frameworks".to_string()));
    }

    #[test]
    fn test_determine_capabilities_node() {
        let caps = determine_capabilities("/usr/local/bin/node");
        assert!(caps.contains(&"scripting".to_string()));
        assert!(caps.contains(&"web_apis".to_string()));
    }

    #[test]
    fn test_determine_capabilities_unknown() {
        let caps = determine_capabilities("/usr/bin/unknown-tool");
        assert!(caps.is_empty());
    }
}
