use serde::{Deserialize, Serialize};

use super::script::Step;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Binding {
  #[serde(rename = "none")]
  None,
  #[serde(rename = "scriptRef")]
  ScriptRef {
    #[serde(rename = "scriptId")]
    script_id: String,
    #[serde(default)]
    meta: Option<serde_json::Map<String, serde_json::Value>>,
  },
  #[serde(rename = "simpleAction")]
  SimpleAction {
    action: String,
    #[serde(default)]
    arg: Option<String>,
    #[serde(default)]
    meta: Option<serde_json::Map<String, serde_json::Value>>,
  },
  #[serde(rename = "inlineSequence")]
  InlineSequence {
    steps: Vec<Step>,
    #[serde(default)]
    meta: Option<serde_json::Map<String, serde_json::Value>>,
  },
  #[serde(rename = "program")]
  Program {
    path: String,
    #[serde(default)]
    meta: Option<serde_json::Map<String, serde_json::Value>>,
  },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BindingEntry {
  #[serde(rename = "targetId")]
  pub target_id: String,
  #[serde(rename = "layerId", default)]
  pub layer_id: Option<i32>,
  pub binding: Binding,
}
