use std::{
  collections::HashMap,
  path::PathBuf,
};

use anyhow::Context;
use crate::models::{
  binding::BindingEntry,
  bundle::{Profile, ProfileBundle},
  device::{Capabilities, DeviceInfo, DeviceState, LayerState},
  layout::NormalizedLayout,
  script::Script,
  state::SessionState,
};

use super::files::{copy_seed_data_if_missing, ensure_dir, read_json, write_json_atomic};

#[derive(Clone)]
pub struct MockStore {
  seed_root: PathBuf,
  data_root: PathBuf,
}

impl MockStore {
  pub fn new(seed_root: PathBuf, data_root: PathBuf) -> Self {
    Self { seed_root, data_root }
  }

  pub fn init_dirs(&self) -> anyhow::Result<()> {
    ensure_dir(&self.data_root)?;
    Ok(())
  }

  pub fn copy_seeds_if_needed(&self) -> anyhow::Result<()> {
    copy_seed_data_if_missing(&self.seed_root, &self.data_root)?;
    Ok(())
  }

  fn devices_path(&self) -> PathBuf {
    self.seed_root.join("devices.json")
  }

  fn bundle_path(&self, device_id: &str) -> PathBuf {
    self.seed_root.join("profiles").join(device_id).join("bundle.json")
  }

  fn state_path(&self, device_id: &str) -> PathBuf {
    self
      .data_root
      .join("state")
      .join(format!("{}.json", device_id))
  }

  pub fn load_devices(&self) -> anyhow::Result<Vec<DeviceInfo>> {
    read_json(&self.devices_path()).with_context(|| format!("Failed to load devices from {}", self.devices_path().display()))
  }

  pub fn load_bundle(&self, device_id: &str) -> anyhow::Result<SeedBundle> {
    let path = self.bundle_path(device_id);
    let data: SeedBundle = read_json(&path).with_context(|| format!("Failed to load bundle for device {} from {}", device_id, path.display()))?;
    Ok(data)
  }

  pub fn load_session_state(&self, device_id: &str) -> anyhow::Result<Option<SessionState>> {
    let path = self.state_path(device_id);
    if !path.exists() {
      return Ok(None);
    }
    let mut state: SessionState = read_json(&path).with_context(|| format!("Failed to read state file {}", path.display()))?;
    if state.version != SessionState::current_version() {
      state.version = SessionState::current_version();
      self.save_session_state(device_id, &state)?;
      log::info!("Migrated state {} to version {}", path.display(), state.version);
    }
    Ok(Some(state))
  }

  pub fn save_session_state(&self, device_id: &str, state: &SessionState) -> anyhow::Result<()> {
    let path = self.state_path(device_id);
    if let Some(parent) = path.parent() {
      ensure_dir(parent)?;
    }
    write_json_atomic(&path, state)
  }

  pub fn initial_state_from_bundle(
    &self,
    device_id: &str,
    bundle: &SeedBundle,
  ) -> SessionState {
    let base_state = bundle
      .committed_state
      .clone()
      .unwrap_or_else(|| DeviceState {
        profile_id: bundle.profile.id.clone(),
        layers: bundle.profile.layers.clone(),
        revision: Some(0),
        checksum: Some(0),
      });

    SessionState {
      version: SessionState::current_version(),
      session_id: format!("coldstart-{}", device_id),
      staged: Some(base_state.clone()),
      applied: Some(base_state.clone()),
      committed: Some(base_state),
    }
  }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SeedBundle {
  pub device: DeviceInfo,
  pub capabilities: Capabilities,
  pub profile: Profile,
  pub layout: Option<NormalizedLayout>,
  #[serde(default)]
  pub targets: Vec<String>,
  pub scripts: Vec<Script>,
  #[serde(rename = "committedState", default)]
  pub committed_state: Option<DeviceState>,
  #[serde(default)]
  pub bindings: Vec<BindingEntry>,
}

impl SeedBundle {
  pub fn to_profile_bundle(
    &self,
    session_id: String,
    state: &SessionState,
  ) -> ProfileBundle {
    let layers = state
      .staged
      .as_ref()
      .map(|s| s.layers.clone())
      .or_else(|| state.applied.as_ref().map(|a| a.layers.clone()))
      .or_else(|| state.committed.as_ref().map(|c| c.layers.clone()))
      .unwrap_or_else(|| self.profile.layers.clone());

    let mut profile = self.profile.clone();
    profile.layers = layers;

    ProfileBundle {
      session_id,
      device: self.device.clone(),
      capabilities: self.capabilities.clone(),
      profile,
      layout: self.layout.clone(),
      targets: if self.targets.is_empty() {
        Self::targets_from_layout(self.layout.as_ref())
      } else {
        self.targets.clone()
      },
      scripts: self.scripts.clone(),
      committed_state: state.committed.clone(),
      applied_state: state.applied.clone(),
      staged_state: state.staged.clone(),
      bindings: self.bindings.clone(),
    }
  }

  fn targets_from_layout(layout: Option<&NormalizedLayout>) -> Vec<String> {
    if let Some(l) = layout {
      let mut ids: Vec<String> = l
        .keys
        .iter()
        .map(|k| k.element_id.clone())
        .chain(l.controls.iter().map(|c| c.element_id.clone()))
        .collect();
      ids.sort();
      ids
    } else {
      Vec::new()
    }
  }
}

pub fn update_binding_in_layer(layer: &mut LayerState, entry: &BindingEntry) {
  let mut map: HashMap<String, BindingEntry> = layer
    .bindings
    .iter()
    .cloned()
    .map(|b| (b.target_id.clone(), b))
    .collect();
  map.insert(entry.target_id.clone(), entry.clone());
  layer.bindings = map.into_values().collect();
}

pub fn compute_checksum<T: serde::Serialize>(value: &T) -> u32 {
  if let Ok(json) = serde_json::to_string(value) {
    json.bytes().fold(0u32, |acc, b| acc.wrapping_mul(31).wrapping_add(b as u32))
  } else {
    0
  }
}
