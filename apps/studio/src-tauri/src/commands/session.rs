use tauri::State;

use crate::{
  AppState,
  models::{
    binding::BindingEntry,
    bundle::ProfileBundle,
    device::DeviceInfo,
  },
};
use anyhow::anyhow;

#[tauri::command]
pub fn list_devices(state: State<AppState>) -> tauri::Result<Vec<DeviceInfo>> {
  state
    .backend
    .list_devices()
    .map_err(|e| tauri::Error::from(anyhow!("list_devices failed: {e}")))
}

#[tauri::command]
pub fn open_session(state: State<AppState>, device_id: String) -> tauri::Result<ProfileBundle> {
  state
    .backend
    .open_session(device_id)
    .map_err(|e| tauri::Error::from(anyhow!("open_session failed: {e}")))
}

#[tauri::command]
pub fn close_session(state: State<AppState>, session_id: String) -> tauri::Result<()> {
  state
    .backend
    .close_session(session_id)
    .map_err(|e| tauri::Error::from(anyhow!("close_session failed: {e}")))
}

#[tauri::command]
pub fn set_binding(state: State<AppState>, session_id: String, req: BindingEntry) -> tauri::Result<()> {
  state
    .backend
    .set_binding(session_id, req)
    .map_err(|e| tauri::Error::from(anyhow!("set_binding failed: {e}")))
}

#[tauri::command]
pub fn apply_to_ram(state: State<AppState>, session_id: String) -> tauri::Result<()> {
  state
    .backend
    .apply_to_ram(session_id)
    .map_err(|e| tauri::Error::from(anyhow!("apply_to_ram failed: {e}")))
}

#[tauri::command]
pub fn revert_ram(state: State<AppState>, session_id: String) -> tauri::Result<()> {
  state
    .backend
    .revert_ram(session_id)
    .map_err(|e| tauri::Error::from(anyhow!("revert_ram failed: {e}")))
}

#[tauri::command]
pub fn commit(state: State<AppState>, session_id: String) -> tauri::Result<()> {
  state
    .backend
    .commit(session_id)
    .map_err(|e| tauri::Error::from(anyhow!("commit failed: {e}")))
}

#[tauri::command]
pub fn run(state: State<AppState>, session_id: String, script_id: String) -> tauri::Result<()> {
  state
    .backend
    .run(session_id, script_id)
    .map_err(|e| tauri::Error::from(anyhow!("run failed: {e}")))
}

#[tauri::command]
pub fn stop_all(state: State<AppState>, session_id: String) -> tauri::Result<()> {
  state
    .backend
    .stop_all(session_id)
    .map_err(|e| tauri::Error::from(anyhow!("stop_all failed: {e}")))
}
