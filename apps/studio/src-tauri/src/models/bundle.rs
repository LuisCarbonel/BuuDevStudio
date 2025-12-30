use serde::{Deserialize, Serialize};

use super::{
  binding::BindingEntry,
  device::{Capabilities, DeviceInfo, DeviceState, LayerState},
  layout::NormalizedLayout,
  script::Script,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
  pub id: String,
  pub name: String,
  pub layers: Vec<LayerState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileBundle {
  #[serde(rename = "sessionId")]
  pub session_id: String,
  pub device: DeviceInfo,
  pub capabilities: Capabilities,
  pub profile: Profile,
  pub layout: Option<NormalizedLayout>,
  pub targets: Vec<String>,
  pub scripts: Vec<Script>,
  #[serde(rename = "committedState")]
  pub committed_state: Option<DeviceState>,
  #[serde(rename = "appliedState")]
  pub applied_state: Option<DeviceState>,
  #[serde(rename = "stagedState")]
  #[serde(default)]
  pub staged_state: Option<DeviceState>,
  #[serde(rename = "bindings")]
  #[serde(default)]
  pub bindings: Vec<BindingEntry>,
}
