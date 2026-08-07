export type RootStackParamList = {
  Welcome: undefined;
  Register: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  ProfileEdit: undefined;
  OtpVerify: undefined;
  EnrollmentForm: {
    officialEmail: string;
    officialMobile: string;
    useDummyCollege?: boolean;
  };
  CollegeHome: undefined;
  RequestCourse: {
    courseId?: string;
    category?: string;
  };
  CourseRequestDetail: {
    requestId: string;
  };
  StudentOtp: undefined;
  StudentRegistration: {
    email: string;
    mobile: string;
  };
  StudentHome: undefined;
  StudentSessions: undefined;
  TrainerOtp: undefined;
  TrainerRegistration: {
    email: string;
    mobile: string;
  };
  TrainerHome: undefined;
  CorporateOtp: undefined;
  CorporateRegistration: {
    email: string;
    mobile: string;
  };
  TaskAdminHome: undefined;
  TaskAdminCourses: undefined;
  TaskAdminCourseForm: {
    courseId?: string;
  };
  TaskAdminTrainers: undefined;
  TaskAdminTrainerForm: {
    trainerId?: string;
  };
  TaskAdminReview: {
    enrollmentId: string;
  };
  TrainerSessionDetail: {
    requestId: string;
  };
  StudentSessionDetail: {
    requestId: string;
  };
  SuperAdminHome: undefined;
};
