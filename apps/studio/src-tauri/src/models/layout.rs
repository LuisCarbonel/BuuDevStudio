use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bounds {
  #[serde(rename = "minX")]
  pub min_x: f64,
  #[serde(rename = "maxX")]
  pub max_x: f64,
  #[serde(rename = "minY")]
  pub min_y: f64,
  #[serde(rename = "maxY")]
  pub max_y: f64,
  pub width: f64,
  pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyElement {
  #[serde(rename = "elementId")]
  pub element_id: String,
  #[serde(rename = "matrixId")]
  pub matrix_id: Option<String>,
  pub row: i32,
  pub col: i32,
  pub x: f64,
  pub y: f64,
  pub w: f64,
  pub h: f64,
  #[serde(default)]
  pub rotation: Option<f64>,
  #[serde(rename = "rawLabel", default)]
  pub raw_label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind")]
pub enum ControlKind {
  #[serde(rename = "block")]
  Block,
  #[serde(rename = "encoder-block")]
  EncoderBlock,
  #[serde(rename = "knob")]
  Knob,
  #[serde(rename = "encoder")]
  Encoder,
  #[serde(rename = "oled")]
  Oled,
  #[serde(rename = "button")]
  Button,
  #[serde(rename = "other")]
  Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlElement {
  #[serde(rename = "elementId")]
  pub element_id: String,
  pub kind: ControlKind,
  pub x: f64,
  pub y: f64,
  pub w: f64,
  pub h: f64,
  #[serde(rename = "rawLabel", default)]
  pub raw_label: Option<String>,
  #[serde(rename = "matrixHint", default)]
  pub matrix_hint: Option<String>,
  #[serde(rename = "layoutIndex", default)]
  pub layout_index: Option<i32>,
  #[serde(default)]
  pub flags: Option<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedLayout {
  pub keys: Vec<KeyElement>,
  pub controls: Vec<ControlElement>,
  pub bounds: Bounds,
}
