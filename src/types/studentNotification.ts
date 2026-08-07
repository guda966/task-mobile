export type StudentAlertSource = 'task' | 'college' | 'deadline';

export interface StudentNotification {
  id: string;
  studentId: string;
  source: StudentAlertSource;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  relatedRequestId?: string;
  relatedAssignmentId?: string;
  relatedProgramSessionId?: string;
}
