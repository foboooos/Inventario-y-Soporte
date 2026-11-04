export const LOCATION_TYPES = ['PRINCIPAL', 'SECUNDARIA', 'TERCIARIA'] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];
