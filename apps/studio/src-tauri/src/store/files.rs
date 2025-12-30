use std::{
  fs,
  io::Write,
  path::{Path, PathBuf},
};

use anyhow::Context;
use serde::{de::DeserializeOwned, Serialize};

pub fn ensure_dir(path: &Path) -> anyhow::Result<()> {
  fs::create_dir_all(path).with_context(|| format!("Failed to create directory {}", path.display()))
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> anyhow::Result<T> {
  let data = fs::read_to_string(path).with_context(|| format!("Failed to read {}", path.display()))?;
  let parsed = serde_json::from_str::<T>(&data).with_context(|| format!("Failed to parse {}", path.display()))?;
  Ok(parsed)
}

pub fn write_json_atomic<T: Serialize>(path: &Path, value: &T) -> anyhow::Result<()> {
  if let Some(parent) = path.parent() {
    ensure_dir(parent)?;
  }
  let json = serde_json::to_string_pretty(value)?;
  let tmp_path = tmp_path_for(path);
  {
    let mut f = fs::File::create(&tmp_path).with_context(|| format!("Failed to create temp file {}", tmp_path.display()))?;
    f.write_all(json.as_bytes())
      .with_context(|| format!("Failed to write temp file {}", tmp_path.display()))?;
    f.sync_all().ok();
  }
  fs::rename(&tmp_path, path).with_context(|| format!("Failed to rename temp file {}", path.display()))?;
  Ok(())
}

pub fn copy_seed_data_if_missing(seed_root: &Path, data_root: &Path) -> anyhow::Result<()> {
  if data_root.exists() {
    return Ok(());
  }
  copy_dir(seed_root, data_root)
}

fn copy_dir(from: &Path, to: &Path) -> anyhow::Result<()> {
  ensure_dir(to)?;
  for entry in fs::read_dir(from)? {
    let entry = entry?;
    let file_type = entry.file_type()?;
    let src_path = entry.path();
    let dst_path = to.join(entry.file_name());
    if file_type.is_dir() {
      copy_dir(&src_path, &dst_path)?;
    } else {
      fs::copy(&src_path, &dst_path)
        .with_context(|| format!("Failed to copy {} to {}", src_path.display(), dst_path.display()))?;
    }
  }
  Ok(())
}

fn tmp_path_for(path: &Path) -> PathBuf {
  let mut tmp = path.to_path_buf();
  let file_name = path
    .file_name()
    .map(|n| n.to_string_lossy().to_string())
    .unwrap_or_else(|| "temp.json".to_string());
  tmp.set_file_name(format!(".{}.tmp", file_name));
  tmp
}
