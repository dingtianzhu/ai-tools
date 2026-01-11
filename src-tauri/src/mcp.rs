use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

/// MCP Session information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPSession {
    pub session_id: String,
    pub tools: Vec<String>,
    pub status: SessionStatus,
    pub pending_tasks: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionStatus {
    Active,
    Idle,
    Error,
}

/// Task result from an AI tool
#[derive(Debug, Serialize, Deserialize)]
pub struct TaskResult {
    pub tool_id: String,
    pub status: TaskStatus,
    pub output: String,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum TaskStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

/// MCP Status response
#[derive(Debug, Serialize, Deserialize)]
pub struct MCPStatus {
    pub session_id: String,
    pub active_tools: Vec<String>,
    pub pending_tasks: u32,
}

/// Global MCP session registry
fn mcp_sessions() -> &'static Mutex<HashMap<String, MCPSession>> {
    static SESSIONS: OnceLock<Mutex<HashMap<String, MCPSession>>> = OnceLock::new();
    SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Create a new MCP session
#[tauri::command]
pub async fn create_mcp_session(tools: Vec<String>) -> Result<String, String> {
    let session_id = generate_session_id();
    
    let session = MCPSession {
        session_id: session_id.clone(),
        tools: tools.clone(),
        status: SessionStatus::Active,
        pending_tasks: 0,
    };

    let mut sessions = mcp_sessions().lock().map_err(|e| e.to_string())?;
    sessions.insert(session_id.clone(), session);

    Ok(session_id)
}

/// Distribute a task to AI tools
#[tauri::command]
pub async fn distribute_task(
    session_id: String,
    task: String,
    tool_assignments: HashMap<String, String>,
) -> Result<Vec<TaskResult>, String> {
    let sessions = mcp_sessions().lock().map_err(|e| e.to_string())?;
    
    if !sessions.contains_key(&session_id) {
        return Err(format!("Session not found: {}", session_id));
    }

    // Create task results for each assigned tool
    let results: Vec<TaskResult> = tool_assignments
        .iter()
        .map(|(tool_id, subtask)| TaskResult {
            tool_id: tool_id.clone(),
            status: TaskStatus::Pending,
            output: format!("Task '{}' assigned: {}", task, subtask),
        })
        .collect();

    Ok(results)
}

/// Get MCP session status
#[tauri::command]
pub async fn get_mcp_status(session_id: String) -> Result<MCPStatus, String> {
    let sessions = mcp_sessions().lock().map_err(|e| e.to_string())?;
    
    match sessions.get(&session_id) {
        Some(session) => Ok(MCPStatus {
            session_id: session.session_id.clone(),
            active_tools: session.tools.clone(),
            pending_tasks: session.pending_tasks,
        }),
        None => Err(format!("Session not found: {}", session_id)),
    }
}

/// Generate a unique session ID
fn generate_session_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("mcp-{}", duration.as_nanos())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_session_status_serialization() {
        let status = SessionStatus::Active;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"Active\"");
    }

    #[test]
    fn test_task_status_serialization() {
        let status = TaskStatus::Completed;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, "\"Completed\"");
    }
}
