import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { CollegeHomeScreen } from '../screens/CollegeHomeScreen';
import { CourseRequestDetailScreen } from '../screens/CourseRequestDetailScreen';
import { EnrollmentFormScreen } from '../screens/EnrollmentFormScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { OtpVerifyScreen } from '../screens/OtpVerifyScreen';
import { ProfileEditScreen } from '../screens/ProfileEditScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { RequestCourseScreen } from '../screens/RequestCourseScreen';
import { CorporateHomeScreen } from '../screens/CorporateHomeScreen';
import { CorporateOtpScreen } from '../screens/CorporateOtpScreen';
import { CorporateRegistrationScreen } from '../screens/CorporateRegistrationScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { StudentHomeScreen } from '../screens/StudentHomeScreen';
import { StudentOtpScreen } from '../screens/StudentOtpScreen';
import { StudentRegistrationScreen } from '../screens/StudentRegistrationScreen';
import { StudentSessionDetailScreen } from '../screens/StudentSessionDetailScreen';
import { StudentSessionsScreen } from '../screens/StudentSessionsScreen';
import { SuperAdminHomeScreen } from '../screens/SuperAdminHomeScreen';
import { TaskAdminCourseFormScreen } from '../screens/TaskAdminCourseFormScreen';
import { TaskAdminCoursesScreen } from '../screens/TaskAdminCoursesScreen';
import { TaskAdminHomeScreen } from '../screens/TaskAdminHomeScreen';
import { TaskAdminReviewScreen } from '../screens/TaskAdminReviewScreen';
import { TaskAdminTrainerFormScreen } from '../screens/TaskAdminTrainerFormScreen';
import { TaskAdminTrainersScreen } from '../screens/TaskAdminTrainersScreen';
import { TrainerHomeScreen } from '../screens/TrainerHomeScreen';
import { TrainerOtpScreen } from '../screens/TrainerOtpScreen';
import { TrainerRegistrationScreen } from '../screens/TrainerRegistrationScreen';
import { TrainerSessionDetailScreen } from '../screens/TrainerSessionDetailScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { colors } from '../theme/colors';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

function homeForRole(role: string) {
  if (role === 'super_admin') return 'SuperAdminHome';
  if (role === 'task_admin') return 'TaskAdminHome';
  if (role === 'student') return 'StudentHome';
  if (role === 'trainer') return 'TrainerHome';
  if (role === 'corporate') return 'CorporateHome';
  return 'CollegeHome';
}

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? homeForRole(user.role) : 'Welcome'}
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ title: 'Register / Sign up' }}
        />
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign In' }} />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ title: 'Forgot Password' }}
        />
        <Stack.Screen
          name="ProfileEdit"
          component={ProfileEditScreen}
          options={{ title: 'Edit Profile' }}
        />
        <Stack.Screen
          name="OtpVerify"
          component={OtpVerifyScreen}
          options={{ title: 'Verify Contact' }}
        />
        <Stack.Screen
          name="EnrollmentForm"
          component={EnrollmentFormScreen}
          options={{ title: 'College Registration Form' }}
        />
        <Stack.Screen
          name="CollegeHome"
          component={CollegeHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="RequestCourse"
          component={RequestCourseScreen}
          options={{ title: 'Request for course' }}
        />
        <Stack.Screen
          name="CourseRequestDetail"
          component={CourseRequestDetailScreen}
          options={{ title: 'Course Request' }}
        />
        <Stack.Screen
          name="StudentOtp"
          component={StudentOtpScreen}
          options={{ title: 'Student Verify' }}
        />
        <Stack.Screen
          name="StudentRegistration"
          component={StudentRegistrationScreen}
          options={{ title: 'Student Registration' }}
        />
        <Stack.Screen
          name="StudentHome"
          component={StudentHomeScreen}
          options={{ title: 'Student', headerBackVisible: false }}
        />
        <Stack.Screen
          name="StudentSessions"
          component={StudentSessionsScreen}
          options={{ title: 'Training Sessions' }}
        />
        <Stack.Screen
          name="StudentSessionDetail"
          component={StudentSessionDetailScreen}
          options={{ title: 'Session' }}
        />
        <Stack.Screen
          name="TrainerOtp"
          component={TrainerOtpScreen}
          options={{ title: 'Mentor Verify' }}
        />
        <Stack.Screen
          name="TrainerRegistration"
          component={TrainerRegistrationScreen}
          options={{ title: 'Mentor Profile' }}
        />
        <Stack.Screen
          name="TrainerHome"
          component={TrainerHomeScreen}
          options={{ title: 'Mentor', headerBackVisible: false }}
        />
        <Stack.Screen
          name="CorporateOtp"
          component={CorporateOtpScreen}
          options={{ title: 'Corporate Verify' }}
        />
        <Stack.Screen
          name="CorporateRegistration"
          component={CorporateRegistrationScreen}
          options={{ title: 'Corporate Profile' }}
        />
        <Stack.Screen
          name="CorporateHome"
          component={CorporateHomeScreen}
          options={{ title: 'Corporate', headerBackVisible: false }}
        />
        <Stack.Screen
          name="TrainerSessionDetail"
          component={TrainerSessionDetailScreen}
          options={{ title: 'Session workspace' }}
        />
        <Stack.Screen
          name="TaskAdminHome"
          component={TaskAdminHomeScreen}
          options={({ navigation }) => ({
            title: 'TASK Admin',
            headerBackVisible: navigation.canGoBack(),
          })}
        />
        <Stack.Screen
          name="SuperAdminHome"
          component={SuperAdminHomeScreen}
          options={{ title: 'Super Admin', headerBackVisible: false }}
        />
        <Stack.Screen
          name="TaskAdminCourses"
          component={TaskAdminCoursesScreen}
          options={{ title: 'Course Catalogue' }}
        />
        <Stack.Screen
          name="TaskAdminCourseForm"
          component={TaskAdminCourseFormScreen}
          options={{ title: 'Course Form' }}
        />
        <Stack.Screen
          name="TaskAdminTrainers"
          component={TaskAdminTrainersScreen}
          options={{ title: 'Trainers' }}
        />
        <Stack.Screen
          name="TaskAdminTrainerForm"
          component={TaskAdminTrainerFormScreen}
          options={{ title: 'Trainer Form' }}
        />
        <Stack.Screen
          name="TaskAdminReview"
          component={TaskAdminReviewScreen}
          options={{ title: 'Review Application' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
