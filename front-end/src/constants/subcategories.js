/**
 * Suggested sub-category chips per supplier category. The back-end accepts
 * free-text in `sub_category`, so the user can type a custom value via the
 * inline text input when their option isn't here.
 */
export const SUBCATEGORIES_BY_CATEGORY = {
  RAW_MATERIALS: [
    'STEEL', 'ALUMINIUM', 'COPPER', 'PLASTICS', 'GLASS', 'TIMBER', 'CHEMICALS', 'TEXTILES'
  ],
  PACKAGING: [
    'CORRUGATED_BOX', 'FLEXIBLE_FILM', 'GLASS_BOTTLE', 'PET_BOTTLE', 'LABELS', 'PALLETS', 'BUBBLE_WRAP'
  ],
  LOGISTICS: [
    'ROAD_FREIGHT', 'RAIL_FREIGHT', 'AIR_FREIGHT', 'SEA_FREIGHT', 'LAST_MILE', 'COLD_CHAIN', 'WAREHOUSING'
  ],
  IT_SERVICES: [
    'SOFTWARE_DEV', 'CLOUD_HOSTING', 'SAAS', 'SUPPORT_MAINTENANCE', 'NETWORK', 'SECURITY', 'DATA_ANALYTICS'
  ],
  PROFESSIONAL_SERVICES: [
    'AUDIT', 'LEGAL', 'TAX', 'STRATEGY', 'HR_CONSULTING', 'TRAINING', 'DESIGN'
  ],
  MRO: [
    'SPARE_PARTS', 'TOOLS', 'LUBRICANTS', 'SAFETY_GEAR', 'JANITORIAL', 'ELECTRICAL', 'PLUMBING'
  ],
  CAPEX: [
    'MACHINERY', 'VEHICLES', 'BUILDING', 'IT_HARDWARE', 'FURNITURE', 'INFRASTRUCTURE'
  ],
  OTHER: ['MISC']
};

export function subcategoriesFor(category) {
  return SUBCATEGORIES_BY_CATEGORY[category] || [];
}
