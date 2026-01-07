export type OsProfile = 'default' | 'mac' | 'win' | 'linux';

function normalizeOsProfile(value: string | null | undefined): OsProfile | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'mac' || normalized === 'darwin') return 'mac';
  if (normalized === 'win' || normalized === 'windows') return 'win';
  if (normalized === 'linux') return 'linux';
  if (normalized === 'default') return 'default';
  return null;
}

function readOsOverride(): OsProfile | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return normalizeOsProfile(params.get('os'));
}

function detectOsProfile(): OsProfile {
  if (typeof navigator === 'undefined') return 'default';

  const uaData = (navigator as any).userAgentData;
  const platform = (uaData?.platform || navigator.platform || '').toLowerCase();
  const ua = (navigator.userAgent || '').toLowerCase();

  if (platform.includes('mac') || platform.includes('darwin') || ua.includes('mac os')) {
    return 'mac';
  }
  if (platform.includes('win') || ua.includes('windows')) {
    return 'win';
  }
  if (platform.includes('linux') || ua.includes('linux')) {
    return 'linux';
  }
  return 'default';
}

let cachedOsProfile: OsProfile | null = null;

export function getOsProfile(): OsProfile {
  if (cachedOsProfile) return cachedOsProfile;
  cachedOsProfile = readOsOverride() ?? detectOsProfile();
  return cachedOsProfile;
}
