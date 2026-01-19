use serde::Serialize;
use thiserror::Error;

/// Application-wide error types
#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Process error for PID {pid}: {message}")]
    ProcessError { pid: u32, message: String },

    #[error("Configuration invalid at {path}: {errors:?}")]
    ConfigInvalid { path: String, errors: Vec<String> },

    #[error("Tool not installed: {0}")]
    ToolNotInstalled(String),

    #[error("Tool not configured: {0}")]
    ToolNotConfigured(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("MCP error: {0}")]
    McpError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Secure storage error: {0}")]
    SecureStorageError(String),

    #[error("Credential not found: {0}")]
    CredentialNotFound(String),

    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        match err.kind() {
            std::io::ErrorKind::NotFound => AppError::FileNotFound(err.to_string()),
            std::io::ErrorKind::PermissionDenied => AppError::PermissionDenied(err.to_string()),
            _ => AppError::IoError(err.to_string()),
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::SerializationError(err.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::DatabaseError(err.to_string())
    }
}

/// Result type alias for AppError
pub type AppResult<T> = Result<T, AppError>;
