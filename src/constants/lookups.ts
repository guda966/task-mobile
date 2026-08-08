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

/** Mandatory student fee to join a Regional Centre (valid 6 months). */
export const RC_MEMBERSHIP_FEE = 599;
export const RC_MEMBERSHIP_MONTHS = 6;
export const RC_DEFAULT_PASSWORD = 'RcAdmin@123';

export type RegionalCenter = {
  id: string;
  /** Short display name for filters / assignment */
  name: string;
  place: string;
  district: string;
  email: string;
  password: string;
};

/** Official TASK Regional Centres (16). */
export const REGIONAL_CENTERS: RegionalCenter[] = [
  {
    id: 'rc-hanamkonda',
    name: 'RC – Hanamkonda',
    place: 'TASK Regional Center, Ground Floor, Chaithanya Deemed University, Hanamkonda',
    district: 'Hanamkonda',
    email: 'rc.hanamkonda@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-karimnagar',
    name: 'RC – Karimnagar',
    place: 'TASK Regional Center, 1st Floor IT Tower, Karimnagar',
    district: 'Karimnagar',
    email: 'rc.karimnagar@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-nizamabad',
    name: 'RC – Nizamabad',
    place: 'TASK Regional Center, Ground Floor, IT Tower, Nizamabad',
    district: 'Nizamabad',
    email: 'rc.nizamabad@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-khammam',
    name: 'RC – Khammam',
    place: 'TASK Regional Center, Ground Floor, IT Tower, Khammam',
    district: 'Khammam',
    email: 'rc.khammam@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-asifabad',
    name: 'RC – Komaram Bheem Asifabad',
    place: 'TASK Regional Center, 1st Floor, ITDA Building, Asifabad',
    district: 'Komaram Bheem Asifabad',
    email: 'rc.asifabad@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-mulugu',
    name: 'RC – Mulugu',
    place: 'TASK Regional Center, Opp to SP Office, Mulugu',
    district: 'Mulugu',
    email: 'rc.mulugu@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-hyd-masabtank',
    name: 'RC – Hyderabad (Masabtank)',
    place: 'TASK Regional Center, 1st Floor, S V Bhavan, Masabtank, Hyderabad',
    district: 'Hyderabad',
    email: 'rc.hyderabad@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-hyd-chanchalguda',
    name: 'RC – Hyderabad (Chanchalguda)',
    place: 'TASK Regional Center, Officers Colony, Near Markazi E Anjuman Mahadavia, Chanchalguda, Hyderabad',
    district: 'Hyderabad',
    email: 'rc.chanchalguda@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-peddapalli',
    name: 'RC – Peddapalli',
    place: 'TASK Regional Center, Mahila Samakya Building, near Bus Stand, Peddapalli',
    district: 'Peddapalli',
    email: 'rc.peddapalli@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-mahabubnagar',
    name: 'RC – Mahabubnagar',
    place: 'TASK Regional Center, Municipal Community Hall, Near Railway Station Road, Mahabubnagar',
    district: 'Mahbubnagar',
    email: 'rc.mahabubnagar@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-nalgonda',
    name: 'RC – Nalgonda',
    place: 'TASK Regional Center, Ground Floor, IT Tower, Nalgonda',
    district: 'Nalgonda',
    email: 'rc.nalgonda@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-sircilla',
    name: 'RC – Rajanna Sircilla',
    place: 'TASK Regional Center, 1st Floor, District Library, Rajanna Sircilla',
    district: 'Rajanna Sircilla',
    email: 'rc.sircilla@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-siddipet',
    name: 'RC – Siddipet',
    place: 'TASK Regional Center, Ground Floor, IT Tower, Siddipet',
    district: 'Siddipet',
    email: 'rc.siddipet@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-mancherial',
    name: 'RC – Mancherial',
    place: 'TASK Regional Center, Ground Floor, District Collectorate building, Mancherial',
    district: 'Mancherial',
    email: 'rc.mancherial@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-bhupalpally',
    name: 'RC – Bhupalpally',
    place:
      'TASK Regional Center, Skill Development Center-SCCL, beside Kakatiya Guest House, Workshop Area, Bhupalpally',
    district: 'Jayashankar Bhupalpally',
    email: 'rc.bhupalpally@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
  {
    id: 'rc-adilabad',
    name: 'RC – Adilabad',
    place: 'TASK Training Center, TTDC, DRDA Training Center, Dasanapur, Adilabad',
    district: 'Adilabad',
    email: 'rc.adilabad@task.telangana.gov.in',
    password: RC_DEFAULT_PASSWORD,
  },
];

export function regionalCenterLabel(center: RegionalCenter): string {
  return `${center.name} · ${center.district}`;
}

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
