export const DISTRICTS = [
  'Adilabad',
  'Bhadradri Kothagudem',
  'Hyderabad',
  'Jagtial',
  'Jangaon',
  'Jayashankar Bhupalpally',
  'Jogulamba Gadwal',
  'Kamareddy',
  'Karimnagar',
  'Khammam',
  'Komaram Bheem Asifabad',
  'Mahabubabad',
  'Mahbubnagar',
  'Mancherial',
  'Medak',
  'Medchal',
  'Mulugu',
  'Nagarkurnool',
  'Nalgonda',
  'Narayanpet',
  'Nirmal',
  'Nizamabad',
  'Peddapalli',
  'Rajanna Sircilla',
  'Ranga Reddy',
  'Sangareddy',
  'Siddipet',
  'Suryapet',
  'Vikarabad',
  'Wanaparthy',
  'Warangal (rural)',
  'Warangal (urban)',
  'Yadadri Bhuvanagiri',
] as const;

export const INSTITUTION_TYPES = [
  { value: 'ENGINEERING', label: 'Engineering' },
  { value: 'DEGREE', label: 'Degree' },
  { value: 'DEGREE_PG', label: 'Degree / PG' },
  { value: 'PHARMA', label: 'Pharmacy' },
  { value: 'POLYTECHNIC', label: 'Polytechnic' },
  { value: 'MBA', label: 'MBA' },
  { value: 'PGDM', label: 'PGDM' },
  { value: 'ITI', label: 'ITI' },
  { value: 'INTEGRATED_DEGREE', label: 'Integrated Degree' },
] as const;

export type InstitutionType = (typeof INSTITUTION_TYPES)[number]['value'];

export const COLLEGE_STATUSES = [
  { value: 'GOVERNMENT', label: 'Government' },
  { value: 'AIDED', label: 'Aided' },
  { value: 'PRIVATE', label: 'Private' },
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'AUTONOMOUS', label: 'Autonomous' },
] as const;

export type CollegeStatus = (typeof COLLEGE_STATUSES)[number]['value'];

export const COLLEGE_TYPES = [
  { value: 'CO_ED', label: 'Co-Education' },
  { value: 'MEN', label: 'Men' },
  { value: 'WOMEN', label: 'Women' },
] as const;

export type CollegeType = (typeof COLLEGE_TYPES)[number]['value'];

export const REGISTRATION_KINDS = [
  { value: 'NEW', label: 'New Registration' },
  { value: 'RENEWAL', label: 'Renewal' },
] as const;

export type RegistrationKind = (typeof REGISTRATION_KINDS)[number]['value'];

/** Placeholder fees — confirm current TASK rates before production. */
export const REGISTRATION_FEES: Record<InstitutionType, number> = {
  ENGINEERING: 17700,
  DEGREE: 7080,
  DEGREE_PG: 7080,
  PHARMA: 7080,
  POLYTECHNIC: 7080,
  MBA: 7080,
  PGDM: 7080,
  ITI: 7080,
  INTEGRATED_DEGREE: 7080,
};

export const RENEWAL_FEES: Record<InstitutionType, number> = {
  ENGINEERING: 11800,
  DEGREE: 4720,
  DEGREE_PG: 4720,
  PHARMA: 4720,
  POLYTECHNIC: 4720,
  MBA: 4720,
  PGDM: 4720,
  ITI: 4720,
  INTEGRATED_DEGREE: 4720,
};

export const AFFILIATED_UNIVERSITIES = [
  'JNTU Hyderabad',
  'Osmania University',
  'Kakatiya University',
  'Telangana University',
  'Mahatma Gandhi University',
  'Palamuru University',
  'Satavahana University',
  'Other / Autonomous',
] as const;

export const REGIONAL_CENTERS = [
  { id: 'rc-hyd', name: 'Regional Centre – Hyderabad' },
  { id: 'rc-wgl', name: 'Regional Centre – Warangal' },
  { id: 'rc-knr', name: 'Regional Centre – Karimnagar' },
  { id: 'rc-nzb', name: 'Regional Centre – Nizamabad' },
  { id: 'rc-mbnr', name: 'Regional Centre – Mahbubnagar' },
  { id: 'rc-nlr', name: 'Regional Centre – Nalgonda' },
] as const;

export const CONSUMER_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'rediffmail.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
];
