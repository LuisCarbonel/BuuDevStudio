use crate::models::{
  bundle::ProfileBundle,
  binding::BindingEntry,
  device::DeviceInfo,
};

pub trait DeviceBackend {
  fn list_devices(&self) -> tauri::Result<Vec<DeviceInfo>>;
  fn open_session(&self, device_id: String) -> tauri::Result<ProfileBundle>;
  fn close_session(&self, session_id: String) -> tauri::Result<()>;
  fn set_binding(&self, session_id: String, req: BindingEntry) -> tauri::Result<()>;
  fn apply_to_ram(&self, session_id: String) -> tauri::Result<()>;
  fn revert_ram(&self, session_id: String) -> tauri::Result<()>;
  fn commit(&self, session_id: String) -> tauri::Result<()>;
  fn run(&self, session_id: String, script_id: String) -> tauri::Result<()>;
  fn stop_all(&self, session_id: String) -> tauri::Result<()>;
}
