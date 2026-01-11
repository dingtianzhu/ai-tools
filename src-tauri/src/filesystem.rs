use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::error::AppError;

/// Represents a file or directory entry
#[derive(Debug, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: u64,
    pub modified: u64,
}

/// Read directory contents and return file entries
#[tauri::command]
pub async fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    read_directory_impl(&path).map_err(|e| e.to_string())
}

fn read_directory_impl(path: &str) -> Result<Vec<FileEntry>, AppError> {
    let dir_path = Path::new(path);
    
    if !dir_path.exists() {
        return Err(AppError::FileNotFound(path.to_string()));
    }

    if !dir_path.is_dir() {
        return Err(AppError::IoError(format!("{} is not a directory", path)));
    }

    let mut entries = Vec::new();
    
    for entry in fs::read_dir(dir_path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let path_str = entry.path().to_string_lossy().to_string();
        
        // Normalize path separators for cross-platform compatibility
        let normalized_path = normalize_path(&path_str);
        
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

/// Normalize path separators for cross-platform compatibility
pub fn normalize_path(path: &str) -> String {
    // Use forward slashes consistently
    path.replace('\\', "/")
}

#[cfg(test)]
mod tests {
    use super::*;

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
}
