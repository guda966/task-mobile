import type { CourseRequest } from '../types/collegePortal';

/** Human-readable org for college or Regional Centre course requests. */
export function requesterOrgName(item: {
  requesterType?: CourseRequest['requesterType'];
  collegeName: string;
  regionalCenterName?: string;
}): string {
  if (item.requesterType === 'regional_center') {
    return item.regionalCenterName || item.collegeName;
  }
  return item.collegeName;
}

/** Prefixed label, e.g. "RC · Hyderabad" or "College · Vivekananda". */
export function requesterLabel(item: {
  requesterType?: CourseRequest['requesterType'];
  collegeName: string;
  regionalCenterName?: string;
}): string {
  const name = requesterOrgName(item);
  return item.requesterType === 'regional_center' ? `RC · ${name}` : `College · ${name}`;
}

export function isRcRequest(item: {
  requesterType?: CourseRequest['requesterType'];
}): boolean {
  return item.requesterType === 'regional_center';
}
