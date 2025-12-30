use serde::{Deserialize, Serialize};

use super::binding::BindingEntry;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
  pub id: String,
  pub name: String,
  #[serde(default)]
  pub transport: String,
  #[serde(rename = "vendorId", default)]
  pub vendor_id: Option<String>,
  #[serde(rename = "productId", default)]
  pub product_id: Option<String>,
  #[serde(rename = "firmwareVersion", default)]
  pub firmware_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Capabilities {
  #[serde(rename = "volatileApply")]
  pub volatile_apply: bool,
  pub commit: bool,
  pub layouts: bool,
  pub keymap: bool,
  pub scripts: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerState {
  pub id: i32,
  pub bindings: Vec<BindingEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceState {
  #[serde(rename = "profileId")]
  pub profile_id: String,
  pub layers: Vec<LayerState>,
  #[serde(default)]
  pub revision: Option<i32>,
  #[serde(default)]
  pub checksum: Option<u32>,
}
