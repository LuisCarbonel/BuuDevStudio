use serde::{Deserialize, Serialize};

use super::device::DeviceState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionState {
  #[serde(default = "SessionState::current_version")]
  pub version: u32,
  #[serde(rename = "sessionId")]
  pub session_id: String,
  #[serde(default)]
  pub staged: Option<DeviceState>,
  #[serde(default)]
  pub applied: Option<DeviceState>,
  #[serde(default)]
  pub committed: Option<DeviceState>,
}

impl SessionState {
  pub const fn current_version() -> u32 {
    1
  }
}
