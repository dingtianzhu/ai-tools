mod error;
mod filesystem;
mod process;
mod cli_adapter;
mod config;
mod mcp;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            filesystem::read_directory,
            filesystem::read_file,
            filesystem::write_file,
            process::spawn_cli_process,
            process::send_to_process,
            process::kill_process,
            process::get_process_output,
            cli_adapter::get_available_adapters,
            cli_adapter::detect_cli_tool,
            cli_adapter::run_health_check,
            config::read_tool_config,
            config::write_tool_config,
            config::validate_config,
            config::get_config_path,
            mcp::create_mcp_session,
            mcp::distribute_task,
            mcp::get_mcp_status,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
