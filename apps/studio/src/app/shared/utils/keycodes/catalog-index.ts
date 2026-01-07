import defaultCatalog from '../../../../assets/catalogs/default.json';

export interface CatalogData {
  version?: string;
  keycodes: unknown[];
  mods?: Record<string, number>;
}

export type CatalogId = 'default' | 'vial-v6' | 'legacy';

export const DEFAULT_CATALOG_ID: CatalogId = 'default';

export const CATALOG_INDEX: Record<CatalogId, CatalogData> = {
  default: defaultCatalog as CatalogData,
  'vial-v6': defaultCatalog as CatalogData,
  legacy: defaultCatalog as CatalogData,
};

export const CATALOG_ALIASES: Record<string, CatalogId> = {
  default: 'default',
  current: 'default',
  'vial-v6': 'vial-v6',
  vialv6: 'vial-v6',
  legacy: 'legacy',
};
