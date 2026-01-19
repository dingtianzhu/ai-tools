mod error;
mod filesystem;
mod process;
mod cli_adapter;
mod config;
mod mcp;
mod token_estimator;
mod runtime_monitor;
mod database;
mod secure_storage;
mod store_service;

#[cfg(test)]
mod store_service_test;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            filesystem::read_directory,
            filesystem::read_file,
            filesystem::write_file,
            filesystem::validate_path,
            filesystem::load_gitignore,
            filesystem::apply_file_changes,
            token_estimator::estimate_tokens,
            token_estimator::estimate_tokens_batch,
            token_estimator::get_token_limit,
            process::spawn_cli_process,
            process::send_to_process,
            process::kill_process,
            process::get_process_output,
            process::start_runtime,
            process::stop_runtime,
            process::restart_runtime,
            process::stream_process_output,
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
            runtime_monitor::scan_runtimes,
            runtime_monitor::get_runtime_status,
            runtime_monitor::estimate_resource_usage,
            runtime_monitor::validate_runtime_path,
            database::init_database,
            database::save_session,
            database::load_sessions,
            database::save_message,
            database::load_messages,
            database::search_messages,
            database::delete_session,
            database::export_session,
            secure_storage::store_credential,
            secure_storage::retrieve_credential,
            secure_storage::delete_credential,
            secure_storage::list_credentials,
            secure_storage::store_credential_tracked,
            secure_storage::delete_credential_tracked,
            store_service::load_settings,
            store_service::save_settings,
            store_service::load_projects,
            store_service::save_projects,
            store_service::load_runtimes,
            store_service::save_runtimes,
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
