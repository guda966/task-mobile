export type TrainingRegistrationStatus = 'registered' | 'cancelled' | 'completed';

export interface TrainingRegistration {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseRequestId: string;
  courseName: string;
  category: string;
  collegeName: string;
  enrollmentId: string;
  branch: string;
  yearOfGraduation: string;
  startDate: string;
  endDate: string;
  status: TrainingRegistrationStatus;
  registeredAt: string;
}
