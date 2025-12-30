pub mod models;
pub mod backends;
pub mod store;
pub mod commands;

use backends::r#trait::DeviceBackend;
use tauri::Manager;
use std::path::PathBuf;

fn resolve_seed_root() -> PathBuf {
  let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));

  let mut candidates = vec![
    cwd.join("src-tauri").join("mock"),
    cwd.join("mock"),
  ];

  if let Some(parent) = cwd.parent() {
    candidates.push(parent.join("src-tauri").join("mock"));
    candidates.push(parent.join("mock"));
  }

  for path in candidates {
    if path.join("devices.json").exists() {
      return path;
    }
  }

  cwd.join("src-tauri").join("mock")
}

pub struct AppState {
  pub backend: Box<dyn DeviceBackend + Send + Sync>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let seed_root = resolve_seed_root();
      let data_root = dirs::data_dir()
        .unwrap_or_else(|| std::env::temp_dir())
        .join("BuuDevStudio")
        .join("mock-state");

      let backend = backends::mock::MockBackend::new(seed_root, data_root);
      app.manage(AppState {
        backend: Box::new(backend),
      });

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::session::list_devices,
      commands::session::open_session,
      commands::session::close_session,
      commands::session::set_binding,
      commands::session::apply_to_ram,
      commands::session::revert_ram,
      commands::session::commit,
      commands::session::run,
      commands::session::stop_all,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
