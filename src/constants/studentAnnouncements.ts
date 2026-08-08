/** Latest TASK programme updates shown to students on Home. */
export const STUDENT_ANNOUNCEMENTS = [
  {
    id: 'ann_rc_membership_2026',
    title: 'Join a TASK Regional Centre',
    body: 'Pay ₹599 (valid 6 months) to join an RC. After TASK Admin approves your centre’s course request, enrol under Trainings → RC.',
  },
  {
    id: 'ann_skills_2026',
    title: 'New soft-skills batches open',
    body: '21st Century Transferrable Skills workshops are open for CSE and allied branches this month.',
  },
  {
    id: 'ann_cert_rules',
    title: 'Certificate rule reminder',
    body: 'Certificates need at least 75% attendance and all assignments accepted by the trainer.',
  },
  {
    id: 'ann_deadline',
    title: 'Submit assignments on time',
    body: 'Check Trainings → Assignments for due dates. Late work may need trainer approval.',
  },
  {
    id: 'ann_college',
    title: 'Only TASK-approved colleges',
    body: 'Students must belong to a college registered and approved with TASK to join batches.',
  },
  {
    id: 'ann_support',
    title: 'Need help in a session?',
    body: 'Use Queries inside your training to ask the assigned trainer for support.',
  },
] as const;

export type StudentAnnouncement = (typeof STUDENT_ANNOUNCEMENTS)[number];

export const LATEST_ANNOUNCEMENT = STUDENT_ANNOUNCEMENTS[0];
