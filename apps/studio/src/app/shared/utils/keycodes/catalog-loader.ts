import { CATALOG_ALIASES, CATALOG_INDEX, CatalogData, CatalogId, DEFAULT_CATALOG_ID } from './catalog-index';

function normalizeCatalogId(value: string | null | undefined): CatalogId | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  return CATALOG_ALIASES[key] ?? null;
}

function readCatalogOverride(): CatalogId | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return normalizeCatalogId(params.get('catalog'));
}

let activeCatalogId: CatalogId = readCatalogOverride() ?? DEFAULT_CATALOG_ID;

export function getActiveCatalogId(): CatalogId {
  return activeCatalogId;
}

export function getActiveCatalog(): CatalogData {
  return CATALOG_INDEX[activeCatalogId] ?? CATALOG_INDEX[DEFAULT_CATALOG_ID];
}

export function setActiveCatalogId(id: CatalogId) {
  activeCatalogId = id;
}

export function resolveCatalogId(value: string | null | undefined): CatalogId {
  return normalizeCatalogId(value) ?? DEFAULT_CATALOG_ID;
}
