use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Step {
  pub id: i32,
  pub name: String,
  pub op: String,
  #[serde(default)]
  pub arg: Option<String>,
  #[serde(default)]
  pub class: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
  pub id: String,
  #[serde(rename = "profileId")]
  pub profile_id: String,
  pub name: String,
  pub steps: Vec<Step>,
  #[serde(default)]
  pub meta: Option<serde_json::Map<String, serde_json::Value>>,
}
