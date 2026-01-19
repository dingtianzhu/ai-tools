use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use ignore::gitignore::{Gitignore, GitignoreBuilder};

use crate::error::AppError;

/// Represents a file or directory entry
#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: u64,
    pub ignored: bool,
}

/// Path validation result
#[derive(Debug, Serialize, Deserialize)]
pub struct PathValidation {
    pub exists: bool,
    pub is_directory: bool,
    pub is_readable: bool,
    pub absolute_path: String,
}

/// File change operation
#[derive(Debug, Serialize, Deserialize)]
pub struct FileChange {
    pub path: String,
    pub change_type: String, // "create", "modify", "delete"
    pub content: Option<String>,
}

/// Read directory contents and return file entries
#[tauri::command]
pub async fn read_directory(path: String, respect_gitignore: bool) -> Result<Vec<FileEntry>, String> {
    read_directory_impl(&path, respect_gitignore).map_err(|e| e.to_string())
}

fn read_directory_impl(path: &str, respect_gitignore: bool) -> Result<Vec<FileEntry>, AppError> {
    let dir_path = Path::new(path);
    
    if !dir_path.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }

    if !dir_path.is_dir() {
        return Err(AppError::IoError(format!("{} is not a directory", path)));
    }

    // Load gitignore if requested
    let gitignore = if respect_gitignore {
        load_gitignore_impl(path).ok()
    } else {
        None
    };

    let mut entries = Vec::new();
    
    for entry in fs::read_dir(dir_path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let path_buf = entry.path();
        let path_str = path_buf.to_string_lossy().to_string();
        
        // Normalize path separators for cross-platform compatibility
        let normalized_path = normalize_path(&path_str);
        
        // Check if file is ignored by gitignore
        let is_ignored = if let Some(ref gi) = gitignore {
            gi.matched(&path_buf, metadata.is_dir()).is_ignore()
        } else {
            false
        };
        
        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: normalized_path,
            is_directory: metadata.is_dir(),
            size: metadata.len(),
            modified,
            ignored: is_ignored,
        });
    }

    // Sort: directories first, then files, alphabetically
    entries.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

/// Read file contents as string
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    read_file_impl(&path).map_err(|e| e.to_string())
}

fn read_file_impl(path: &str) -> Result<String, AppError> {
    let file_path = Path::new(path);
    
    if !file_path.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }

    if !file_path.is_file() {
        return Err(AppError::IoError(format!("{} is not a file", path)));
    }

    Ok(fs::read_to_string(file_path)?)
}

/// Write content to a file
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    write_file_impl(&path, &content).map_err(|e| e.to_string())
}

fn write_file_impl(path: &str, content: &str) -> Result<(), AppError> {
    let file_path = Path::new(path);
    
    // Create parent directories if they don't exist
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)?;
        }
    }

    fs::write(file_path, content)?;
    Ok(())
}

/// Validate a path and return information about it
#[tauri::command]
pub async fn validate_path(path: String) -> Result<PathValidation, String> {
    validate_path_impl(&path).map_err(|e| e.to_string())
}

fn validate_path_impl(path: &str) -> Result<PathValidation, AppError> {
    let path_buf = PathBuf::from(path);
    
    // Try to canonicalize the path to get absolute path
    let absolute_path = if path_buf.exists() {
        path_buf.canonicalize()
            .map(|p| normalize_path(&p.to_string_lossy()))
            .unwrap_or_else(|_| normalize_path(path))
    } else {
        // If path doesn't exist, try to make it absolute manually
        if path_buf.is_absolute() {
            normalize_path(path)
        } else {
            std::env::current_dir()
                .ok()
                .and_then(|cwd| cwd.join(&path_buf).to_str().map(|s| normalize_path(s)))
                .unwrap_or_else(|| normalize_path(path))
        }
    };
    
    let exists = path_buf.exists();
    let is_directory = exists && path_buf.is_dir();
    
    // Check if readable by attempting to read metadata
    let is_readable = if exists {
        fs::metadata(&path_buf).is_ok()
    } else {
        false
    };
    
    Ok(PathValidation {
        exists,
        is_directory,
        is_readable,
        absolute_path,
    })
}

/// Load gitignore rules from a project directory
#[tauri::command]
pub async fn load_gitignore(project_path: String) -> Result<Vec<String>, String> {
    load_gitignore_rules(&project_path).map_err(|e| e.to_string())
}

fn load_gitignore_rules(project_path: &str) -> Result<Vec<String>, AppError> {
    let gitignore_path = Path::new(project_path).join(".gitignore");
    
    if !gitignore_path.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(&gitignore_path)?;
    let rules: Vec<String> = content
        .lines()
        .filter(|line| !line.trim().is_empty() && !line.trim().starts_with('#'))
        .map(|line| line.to_string())
        .collect();
    
    Ok(rules)
}

fn load_gitignore_impl(project_path: &str) -> Result<Gitignore, AppError> {
    let gitignore_path = Path::new(project_path).join(".gitignore");
    
    let mut builder = GitignoreBuilder::new(project_path);
    
    if gitignore_path.exists() {
        builder.add(&gitignore_path);
    }
    
    builder.build()
        .map_err(|e| AppError::IoError(format!("Failed to build gitignore: {}", e)))
}

/// Apply file changes (create, modify, delete)
#[tauri::command]
pub async fn apply_file_changes(changes: Vec<FileChange>) -> Result<(), String> {
    apply_file_changes_impl(changes).map_err(|e| e.to_string())
}

fn apply_file_changes_impl(changes: Vec<FileChange>) -> Result<(), AppError> {
    for change in changes {
        match change.change_type.as_str() {
            "create" | "modify" => {
                if let Some(content) = change.content {
                    write_file_impl(&change.path, &content)?;
                } else {
                    return Err(AppError::IoError(format!(
                        "Content is required for {} operation on {}",
                        change.change_type, change.path
                    )));
                }
            }
            "delete" => {
                let path = Path::new(&change.path);
                if path.exists() {
                    if path.is_file() {
                        fs::remove_file(path)?;
                    } else if path.is_dir() {
                        fs::remove_dir_all(path)?;
                    }
                }
            }
            _ => {
                return Err(AppError::IoError(format!(
                    "Unknown change type: {}",
                    change.change_type
                )));
            }
        }
    }
    
    Ok(())
}

/// Normalize path separators for cross-platform compatibility
pub fn normalize_path(path: &str) -> String {
    // Use forward slashes consistently
    path.replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_normalize_path_forward_slashes() {
        assert_eq!(normalize_path("a/b/c"), "a/b/c");
    }

    #[test]
    fn test_normalize_path_backward_slashes() {
        assert_eq!(normalize_path("a\\b\\c"), "a/b/c");
    }

    #[test]
    fn test_normalize_path_mixed_slashes() {
        assert_eq!(normalize_path("a/b\\c/d\\e"), "a/b/c/d/e");
    }
    
    #[test]
    fn test_validate_path_existing_directory() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_string_lossy().to_string();
        
        let result = validate_path_impl(&path).unwrap();
        assert!(result.exists);
        assert!(result.is_directory);
        assert!(result.is_readable);
    }
    
    #[test]
    fn test_validate_path_nonexistent() {
        let result = validate_path_impl("/nonexistent/path/that/does/not/exist").unwrap();
        assert!(!result.exists);
        assert!(!result.is_directory);
        assert!(!result.is_readable);
    }
    
    #[test]
    fn test_read_directory_basic() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_string_lossy().to_string();
        
        // Create some test files
        fs::write(temp_dir.path().join("file1.txt"), "content1").unwrap();
        fs::write(temp_dir.path().join("file2.txt"), "content2").unwrap();
        fs::create_dir(temp_dir.path().join("subdir")).unwrap();
        
        let entries = read_directory_impl(&path, false).unwrap();
        assert_eq!(entries.len(), 3);
        
        // Check that directory comes first (due to sorting)
        assert!(entries[0].is_directory);
        assert_eq!(entries[0].name, "subdir");
    }
    
    #[test]
    fn test_gitignore_filtering() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().to_string_lossy().to_string();
        
        // Create .gitignore
        fs::write(temp_dir.path().join(".gitignore"), "*.log\nnode_modules/\n").unwrap();
        
        // Create files
        fs::write(temp_dir.path().join("file.txt"), "content").unwrap();
        fs::write(temp_dir.path().join("debug.log"), "log content").unwrap();
        fs::create_dir(temp_dir.path().join("node_modules")).unwrap();
        
        let entries = read_directory_impl(&path, true).unwrap();
        
        // Should have .gitignore and file.txt, but debug.log and node_modules should be marked as ignored
        let ignored_count = entries.iter().filter(|e| e.ignored).count();
        assert!(ignored_count >= 1); // At least debug.log should be ignored
    }
    
    #[test]
    fn test_file_changes_create() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("new_file.txt");
        let path_str = file_path.to_string_lossy().to_string();
        
        let changes = vec![FileChange {
            path: path_str.clone(),
            change_type: "create".to_string(),
            content: Some("test content".to_string()),
        }];
        
        apply_file_changes_impl(changes).unwrap();
        
        assert!(file_path.exists());
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "test content");
    }
    
    #[test]
    fn test_file_changes_modify() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("file.txt");
        fs::write(&file_path, "original").unwrap();
        
        let path_str = file_path.to_string_lossy().to_string();
        let changes = vec![FileChange {
            path: path_str.clone(),
            change_type: "modify".to_string(),
            content: Some("modified".to_string()),
        }];
        
        apply_file_changes_impl(changes).unwrap();
        
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, "modified");
    }
    
    #[test]
    fn test_file_changes_delete() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("file.txt");
        fs::write(&file_path, "content").unwrap();
        assert!(file_path.exists());
        
        let path_str = file_path.to_string_lossy().to_string();
        let changes = vec![FileChange {
            path: path_str,
            change_type: "delete".to_string(),
            content: None,
        }];
        
        apply_file_changes_impl(changes).unwrap();
        assert!(!file_path.exists());
    }
}

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;
    use tempfile::TempDir;
    use std::fs;

    // Configure proptest to run fewer cases for faster tests
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        // Property 5: Path Validation Correctness
        // **Validates: Requirements 4.1**
        #[test]
        fn property_5_path_validation_correctness(path in "[a-zA-Z0-9_/\\-\\.]+") {
            // For any path string, validation should not panic and should return consistent results
            let result = validate_path_impl(&path);
            
            // Should always return a result (Ok or Err)
            prop_assert!(result.is_ok());
            
            if let Ok(validation) = result {
                // If exists is true, then we should be able to verify it
                if validation.exists {
                    let path_buf = std::path::PathBuf::from(&path);
                    prop_assert!(path_buf.exists());
                    
                    // If is_directory is true, it should actually be a directory
                    if validation.is_directory {
                        prop_assert!(path_buf.is_dir());
                    }
                }
                
                // absolute_path should always be set
                prop_assert!(!validation.absolute_path.is_empty());
            }
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        // Property 6: File Tree Completeness
        // **Validates: Requirements 4.3**
        #[test]
        fn property_6_file_tree_completeness(
            num_files in 1usize..5,
            num_dirs in 0usize..3
        ) {
            let temp_dir = TempDir::new().unwrap();
            let path = temp_dir.path().to_string_lossy().to_string();
            
            // Create files
            for i in 0..num_files {
                let file_path = temp_dir.path().join(format!("file{}.txt", i));
                fs::write(&file_path, format!("content{}", i)).unwrap();
            }
            
            // Create directories
            for i in 0..num_dirs {
                let dir_path = temp_dir.path().join(format!("dir{}", i));
                fs::create_dir(&dir_path).unwrap();
            }
            
            let entries = read_directory_impl(&path, false).unwrap();
            
            // Should have all files and directories
            prop_assert_eq!(entries.len(), num_files + num_dirs);
            
            // Count files and directories
            let file_count = entries.iter().filter(|e| !e.is_directory).count();
            let dir_count = entries.iter().filter(|e| e.is_directory).count();
            
            prop_assert_eq!(file_count, num_files);
            prop_assert_eq!(dir_count, num_dirs);
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        // Property 7: Gitignore Filtering Correctness
        // **Validates: Requirements 4.4**
        #[test]
        fn property_7_gitignore_filtering(
            ignored_pattern in "[a-z]+\\.(log|tmp)",
            normal_file in "[a-z]+\\.txt"
        ) {
            let temp_dir = TempDir::new().unwrap();
            let path = temp_dir.path().to_string_lossy().to_string();
            
            // Create .gitignore with pattern
            fs::write(temp_dir.path().join(".gitignore"), "*.log\n*.tmp\n").unwrap();
            
            // Create files
            let ignored_path = temp_dir.path().join(&ignored_pattern);
            let normal_path = temp_dir.path().join(&normal_file);
            
            fs::write(&ignored_path, "ignored content").unwrap();
            fs::write(&normal_path, "normal content").unwrap();
            
            let entries = read_directory_impl(&path, true).unwrap();
            
            // Find the entries
            let ignored_entry = entries.iter().find(|e| e.name == ignored_pattern);
            let normal_entry = entries.iter().find(|e| e.name == normal_file);
            
            // The ignored file should be marked as ignored
            if let Some(entry) = ignored_entry {
                prop_assert!(entry.ignored, "File {} should be ignored", ignored_pattern);
            }
            
            // The normal file should not be ignored
            if let Some(entry) = normal_entry {
                prop_assert!(!entry.ignored, "File {} should not be ignored", normal_file);
            }
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        // Property 10: File Change Application
        // **Validates: Requirements 6.6**
        #[test]
        fn property_10_file_change_application(
            content in "[a-zA-Z0-9 \\n]+",
            filename in "[a-z]{3,10}\\.txt"
        ) {
            let temp_dir = TempDir::new().unwrap();
            let file_path = temp_dir.path().join(&filename);
            let path_str = file_path.to_string_lossy().to_string();
            
            // Test create
            let changes = vec![FileChange {
                path: path_str.clone(),
                change_type: "create".to_string(),
                content: Some(content.clone()),
            }];
            
            let result = apply_file_changes_impl(changes);
            prop_assert!(result.is_ok());
            prop_assert!(file_path.exists());
            
            let read_content = fs::read_to_string(&file_path).unwrap();
            prop_assert_eq!(read_content, content.clone());
            
            // Test modify
            let new_content = format!("{}_modified", content);
            let changes = vec![FileChange {
                path: path_str.clone(),
                change_type: "modify".to_string(),
                content: Some(new_content.clone()),
            }];
            
            let result = apply_file_changes_impl(changes);
            prop_assert!(result.is_ok());
            
            let read_content = fs::read_to_string(&file_path).unwrap();
            prop_assert_eq!(read_content, new_content);
            
            // Test delete
            let changes = vec![FileChange {
                path: path_str,
                change_type: "delete".to_string(),
                content: None,
            }];
            
            let result = apply_file_changes_impl(changes);
            prop_assert!(result.is_ok());
            prop_assert!(!file_path.exists());
        }
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(10))]
        
        // Property 39: Cross-Platform Path Handling
        // **Validates: Requirements 25.3**
        #[test]
        fn property_39_cross_platform_path_handling(
            path_parts in prop::collection::vec("[a-zA-Z0-9_-]+", 1..4)
        ) {
            // Test with forward slashes
            let forward_path = path_parts.join("/");
            let normalized_forward = normalize_path(&forward_path);
            prop_assert!(!normalized_forward.contains('\\'));
            prop_assert_eq!(normalized_forward, forward_path.clone());
            
            // Test with backward slashes
            let backward_path = path_parts.join("\\");
            let normalized_backward = normalize_path(&backward_path);
            prop_assert!(!normalized_backward.contains('\\'));
            prop_assert_eq!(normalized_backward, forward_path.clone());
            
            // Test with mixed slashes
            let mut mixed_path = String::new();
            for (i, part) in path_parts.iter().enumerate() {
                if i > 0 {
                    mixed_path.push(if i % 2 == 0 { '/' } else { '\\' });
                }
                mixed_path.push_str(part);
            }
            let normalized_mixed = normalize_path(&mixed_path);
            prop_assert!(!normalized_mixed.contains('\\'));
            prop_assert_eq!(normalized_mixed, forward_path);
        }
    }
}
