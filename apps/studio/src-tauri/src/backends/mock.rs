use std::collections::HashMap;
use std::sync::Mutex;

use crate::{
  models::{
    binding::BindingEntry,
    bundle::ProfileBundle,
    device::DeviceInfo,
    state::SessionState,
  },
  store::{MockStore, store::{update_binding_in_layer, compute_checksum}},
};

use super::r#trait::DeviceBackend;
use anyhow::anyhow;
use uuid::Uuid;

pub struct MockBackend {
  store: MockStore,
  sessions: Mutex<HashMap<String, String>>,
}

impl MockBackend {
  pub fn new(seed_root: std::path::PathBuf, data_root: std::path::PathBuf) -> Self {
    let store = MockStore::new(seed_root, data_root);
    Self {
      store,
      sessions: Mutex::new(HashMap::new()),
    }
  }

  fn device_for_session(&self, session_id: &str) -> anyhow::Result<String> {
    let guard = self.sessions.lock().unwrap();
    guard
      .get(session_id)
      .cloned()
      .ok_or_else(|| anyhow!("Unknown session"))
  }

  fn save_session(&self, device_id: &str, session: &SessionState) -> anyhow::Result<()> {
    self.store.save_session_state(device_id, session)?;
    Ok(())
  }
}

impl DeviceBackend for MockBackend {
  fn list_devices(&self) -> tauri::Result<Vec<DeviceInfo>> {
    let devices = self.store.load_devices()?;
    Ok(devices)
  }

  fn open_session(&self, _device_id: String) -> tauri::Result<ProfileBundle> {
    let device_id = _device_id;
    self.store.init_dirs()?;
    self.store.copy_seeds_if_needed()?;
    let seeds = self.store.load_bundle(&device_id)?;
    let mut session_state = if let Some(existing) = self.store.load_session_state(&device_id)? {
      existing
    } else {
      self.store.initial_state_from_bundle(&device_id, &seeds)
    };
    let session_id = Uuid::new_v4().to_string();
    session_state.session_id = session_id.clone();

    {
      let mut guard = self.sessions.lock().unwrap();
      guard.insert(session_id.clone(), device_id.clone());
    }

    self.save_session(&device_id, &session_state)?;

    Ok(seeds.to_profile_bundle(session_id, &session_state))
  }

  fn close_session(&self, _session_id: String) -> tauri::Result<()> {
    let session_id = _session_id;
    let mut guard = self.sessions.lock().unwrap();
    guard.remove(&session_id);
    Ok(())
  }

  fn set_binding(&self, _session_id: String, _req: BindingEntry) -> tauri::Result<()> {
    let session_id = _session_id;
    let req = _req;
    let device_id = self.device_for_session(&session_id)?;
    let mut session = self
      .store
      .load_session_state(&device_id)?
      .ok_or_else(|| anyhow!("No session state found"))?;

    let staged = session
      .staged
      .as_mut()
      .ok_or_else(|| anyhow!("No staged state"))?;

    let target_layer_id = req.layer_id.unwrap_or_else(|| staged.layers.get(0).map(|l| l.id).unwrap_or(1));
    let mut layer = staged
      .layers
      .iter_mut()
      .find(|l| l.id == target_layer_id)
      .ok_or_else(|| anyhow!("Layer {} not found", target_layer_id))?;
    update_binding_in_layer(&mut layer, &req);
    staged.checksum = Some(compute_checksum(staged));

    self.save_session(&device_id, &session)?;
    Ok(())
  }

  fn apply_to_ram(&self, _session_id: String) -> tauri::Result<()> {
    let session_id = _session_id;
    let device_id = self.device_for_session(&session_id)?;
    let mut session = self
      .store
      .load_session_state(&device_id)?
      .ok_or_else(|| anyhow!("No session state found"))?;

    if let Some(staged) = session.staged.clone() {
      session.applied = Some(staged);
      if let Some(applied) = session.applied.as_mut() {
        applied.revision = Some(applied.revision.unwrap_or(0));
        applied.checksum = Some(compute_checksum(applied));
      }
      self.save_session(&device_id, &session)?;
    }
    Ok(())
  }

  fn revert_ram(&self, _session_id: String) -> tauri::Result<()> {
    let session_id = _session_id;
    let device_id = self.device_for_session(&session_id)?;
    let mut session = self
      .store
      .load_session_state(&device_id)?
      .ok_or_else(|| anyhow!("No session state found"))?;

    if let Some(committed) = session.committed.clone() {
      session.applied = Some(committed.clone());
      session.staged = Some(committed);
      self.save_session(&device_id, &session)?;
    }
    Ok(())
  }

  fn commit(&self, _session_id: String) -> tauri::Result<()> {
    let session_id = _session_id;
    let device_id = self.device_for_session(&session_id)?;
    let mut session = self
      .store
      .load_session_state(&device_id)?
      .ok_or_else(|| anyhow!("No session state found"))?;

    let source = session
      .applied
      .clone()
      .or_else(|| session.staged.clone())
      .ok_or_else(|| anyhow!("Nothing to commit"))?;

    let mut committed = source.clone();
    committed.revision = Some(committed.revision.unwrap_or(0) + 1);
    committed.checksum = Some(compute_checksum(&committed));
    session.committed = Some(committed.clone());
    session.applied = Some(committed.clone());
    session.staged = Some(committed);
    self.save_session(&device_id, &session)?;
    Ok(())
  }

  fn run(&self, _session_id: String, _script_id: String) -> tauri::Result<()> {
    Ok(())
  }

  fn stop_all(&self, _session_id: String) -> tauri::Result<()> {
    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::models::binding::{Binding, BindingEntry};
  use crate::store::MockStore;

  #[test]
  fn session_flow_commits_state() {
    let seed_root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("mock");
    let data_root = std::env::temp_dir().join(format!("mock-backend-test-{}", Uuid::new_v4()));
    let backend = MockBackend::new(seed_root.clone(), data_root.clone());

    let devices = backend.list_devices().expect("devices");
    assert!(!devices.is_empty());
    let bundle = backend
      .open_session(devices[0].id.clone())
      .expect("open session");

    let session_id = bundle.session_id.clone();
    let binding = BindingEntry {
      layer_id: Some(1),
      target_id: "key:1,1".to_string(),
      binding: Binding::SimpleAction {
        action: "TAP".to_string(),
        arg: Some("KC_ENTER".to_string()),
        meta: None,
      },
    };
    backend
      .set_binding(session_id.clone(), binding)
      .expect("set binding");
    backend.apply_to_ram(session_id.clone()).expect("apply");
    backend.commit(session_id.clone()).expect("commit");

    let store = MockStore::new(seed_root, data_root.clone());
    let state = store
      .load_session_state(&devices[0].id)
      .expect("load state")
      .expect("state exists");

    assert!(state.committed.is_some());

    if let Some(committed) = state.committed {
      let layer = committed.layers.iter().find(|l| l.id == 1).unwrap();
      assert!(
        layer
          .bindings
          .iter()
          .any(|b| b.target_id == "key:1,1"),
        "new binding persisted to committed"
      );
      assert!(committed.revision.unwrap_or(0) >= 1);
    }

    let _ = std::fs::remove_dir_all(&data_root);
  }
}
