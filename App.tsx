import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Quicksand_500Medium as QS500, Quicksand_600SemiBold as QS600 } from '@expo-google-fonts/quicksand';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import './global.css';
// Initialize logger early so console.log is silenced in non-dev
import './src/lib/logger';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ScheduleProvider } from './src/contexts/ScheduleContext';
import { NutritionProvider } from './src/contexts/NutritionContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MindfulnessScreen } from './src/screens/MindfulnessScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ChatListScreen } from './src/screens/ChatListScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { NutritionCalculatorScreen } from './src/screens/NutritionCalculatorScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CoachDashboardScreen } from './src/screens/CoachDashboardScreen';
import { CoachClientDetailScreen } from './src/screens/CoachClientDetailScreen';
import { CoachNotesScreen } from './src/screens/CoachNotesScreen';
import { AssignClientScreen } from './src/screens/AssignClientScreen';
import { CoachRequestsScreen } from './src/screens/CoachRequestsScreen';
import { CoachSelectionScreen } from './src/screens/CoachSelectionScreen';
import { BecomeCoachScreen } from './src/screens/BecomeCoachScreen';
import { CreateWorkoutPlanScreen } from './src/screens/CreateWorkoutPlanScreen';
import { ClientWorkoutPlansScreen } from './src/screens/ClientWorkoutPlansScreen';
import { CreateNutritionPlanScreen } from './src/screens/CreateNutritionPlanScreen';
import { ClientProgressAnalyticsScreen } from './src/screens/ClientProgressAnalyticsScreen';
import { ActivityMapScreen } from './src/screens/ActivityMapScreen';
import { RunningScreen } from './src/screens/RunningScreen';
import { MusicScreen } from './src/screens/MusicScreen';
import { BarcodeScannerScreen } from './src/screens/BarcodeScannerScreen';
import { BottomNavigation } from './src/components/BottomNavigation';
import { CoachBottomNavigation } from './src/components/CoachBottomNavigation';
import type { TabType } from './src/components/BottomNavigation';
import { colors } from './src/constants/theme';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from './src/tamagui.config';

const { width, height: windowHeight } = Dimensions.get('window');

type Screen = 'splash' | 'login' | 'register' | 'home' | 'mindfulness' | 'mindfulness-insights' | 'chat' | 'chat-list' | 'individual-chat' | 'schedule' | 'nutrition' | 'nutrition-calculator' | 'barcode-scanner' | 'profile' | 'coach-dashboard' | 'coach-client-detail' | 'coach-notes' | 'assign-client' | 'coach-requests' | 'coach-selection' | 'become-coach' | 'create-workout-plan' | 'client-workout-plans' | 'create-nutrition-plan' | 'client-progress-analytics' | 'activity-map' | 'running' | 'music';

const CLIENT_NAV_SCREENS = new Set<Screen>(['home', 'schedule', 'running', 'chat', 'chat-list', 'individual-chat', 'nutrition', 'mindfulness', 'mindfulness-insights', 'music']);
const COACH_NAV_SCREENS = new Set<Screen>(['coach-dashboard', 'schedule', 'coach-requests', 'chat', 'chat-list', 'individual-chat']);

const getClientActiveTab = (screen: Screen): TabType => {
  switch (screen) {
    case 'home': return 'home';
    case 'schedule': return 'schedule';
    case 'running': case 'activity-map': return 'running';
    case 'chat': case 'chat-list': case 'individual-chat': return 'chat';
    case 'nutrition': case 'nutrition-calculator': case 'barcode-scanner': return 'nutrition';
    case 'mindfulness': case 'mindfulness-insights': return 'mindfulness';
    case 'music': return 'music';
    default: return 'home';
  }
};

const getCoachActiveTab = (screen: Screen): 'dashboard' | 'schedule' | 'requests' | 'chat' | 'profile' => {
  switch (screen) {
    case 'coach-dashboard': return 'dashboard';
    case 'schedule': return 'schedule';
    case 'coach-requests': return 'requests';
    case 'chat': case 'chat-list': case 'individual-chat': return 'chat';
    case 'profile': return 'profile';
    default: return 'dashboard';
  }
};

const COACH_TAB_TO_SCREEN: Record<string, Screen> = {
  'dashboard': 'coach-dashboard',
  'schedule': 'schedule',
  'requests': 'coach-requests',
  'chat': 'chat',
  'profile': 'profile',
};

function AppContent() {
  const { user, loading: authLoading, isCoach, coachStatusLoaded, canBeCoach, currentMode } = useAuth();
  
  // Add safety checks for initial values
  const safeCanBeCoach = canBeCoach ?? false;
  const safeCurrentMode = currentMode ?? null;
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [displayScreen, setDisplayScreen] = useState<Screen>('splash');
  const [splashFinished, setSplashFinished] = useState(false);
  const [clientDetailParams, setClientDetailParams] = useState<any>(null);
  const [notesParams, setNotesParams] = useState<any>(null);
  const [chatParams, setChatParams] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Quicksand_500Medium: QS500,
    Quicksand_600SemiBold: QS600,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DotGothic16_400Regular,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const navigateWithTransition = (targetScreen: Screen, params?: any) => {
    console.log('[App] Navigation requested:', targetScreen, params);
    
    if (targetScreen === 'coach-client-detail') {
      setClientDetailParams(params);
    } else if (targetScreen === 'coach-notes') {
      setNotesParams(params);
    } else if (targetScreen === 'chat' || targetScreen === 'individual-chat') {
      setChatParams(params);
    }
    
    // Switch immediately to keep the navigation bar fluid and snappy
    requestAnimationFrame(() => {
      console.log('[App] Navigating to:', targetScreen);
      setCurrentScreen(targetScreen);
      setDisplayScreen(targetScreen);
    });
  };

  useEffect(() => {
    if (!authLoading && !fontsLoaded) return;
    
    console.log('[App] useEffect triggered:', {
      authLoading,
      fontsLoaded, 
      user: !!user,
      isCoach,
      coachStatusLoaded,
      currentScreen,
      displayScreen
    });
    
    if (!authLoading && fontsLoaded) {
      if (user) {
        // Only route based on isCoach once coach status has been loaded
        if (coachStatusLoaded) {
          // For coaches, always ensure they start in coach mode
          let targetScreen: Screen = isCoach ? 'coach-dashboard' : 'home';
          
          // If user can be a coach but isCoach is false, they might be in client mode
          // but we should respect their choice if they explicitly switched to client mode
          if (safeCanBeCoach && !isCoach && safeCurrentMode === 'client') {
            // User explicitly chose client mode, keep them there
            targetScreen = 'home';
          } else if (safeCanBeCoach && !isCoach && safeCurrentMode !== null) {
            // User is a coach but not in coach mode - this shouldn't happen, switch them
            console.log('[App] 🔄 Coach user not in coach mode, correcting...');
            targetScreen = 'coach-dashboard';
          } else if (safeCanBeCoach && !isCoach && safeCurrentMode === null) {
            // Coach status loaded but mode not set yet, default to coach mode
            console.log('[App] 🔄 Coach user with null mode, defaulting to coach mode...');
            targetScreen = 'coach-dashboard';
          }
          
          console.log('[App] User logged in, determining target screen:', {
            userId: user.id,
            isCoach,
            canBeCoach: safeCanBeCoach,
            currentMode: safeCurrentMode,
            coachStatusLoaded,
            targetScreen,
            currentScreen,
            displayScreen
          });
          
          if (currentScreen === 'splash' || currentScreen === 'login' || currentScreen === 'register') {
            console.log('[App] Initial routing after login:', {
              userId: user.id,
              isCoach,
              canBeCoach: safeCanBeCoach,
              targetScreen,
              currentScreen
            });
            setCurrentScreen(targetScreen);
            setDisplayScreen(targetScreen);
            setSplashFinished(true);
          }
          else if (
            (isCoach && (currentScreen === 'home' || currentScreen === 'become-coach' || currentScreen === 'coach-selection')) || 
            (!isCoach && currentScreen === 'coach-dashboard')
          ) {
            console.log('[App] 🔄 Switching interface based on isCoach change:', {
              userId: user.id,
              isCoach,
              canBeCoach: safeCanBeCoach,
              targetScreen,
              currentScreen,
              reason: isCoach ? 'user became coach' : 'user switched to client'
            });
            setCurrentScreen(targetScreen);
            setDisplayScreen(targetScreen);
          }
        } else {
          // Coach status not loaded yet, show loading state
          console.log('[App] Coach status not loaded yet, waiting...');
        }
      } else {
        if (currentScreen !== 'splash' && currentScreen !== 'login' && currentScreen !== 'register') {
          navigateWithTransition('login');
        } else if (splashFinished && currentScreen === 'splash') {
          navigateWithTransition('login');
        }
      }
    }
  }, [user, authLoading, splashFinished, fontsLoaded, isCoach, coachStatusLoaded]);

  if (!fontsLoaded || authLoading || (user && !coachStatusLoaded)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (currentScreen === 'splash' && !user) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  if (currentScreen === 'splash' && user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <View 
        style={styles.screenContent}
      >
        {displayScreen === 'login' && (
          <LoginScreen onNavigateToRegister={() => navigateWithTransition('register')} />
        )}
        {displayScreen === 'register' && (
          <RegisterScreen onNavigateToLogin={() => navigateWithTransition('login')} />
        )}
        {displayScreen === 'home' && (
          <HomeScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {(displayScreen === 'mindfulness' || displayScreen === 'mindfulness-insights') && (
          <MindfulnessScreen 
            onNavigate={(screen) => navigateWithTransition(screen as Screen)} 
            openStats={displayScreen === 'mindfulness-insights'}
          />
        )}
        {((displayScreen === 'chat') || (displayScreen === 'chat-list')) && (
          <ChatListScreen 
            onNavigate={(screen: string, params?: any) => navigateWithTransition(screen as Screen, params)} 
          />
        )}
        {displayScreen === 'individual-chat' && (
          <ChatScreen 
            onNavigate={(screen: string, params?: any) => navigateWithTransition(screen as Screen, params)} 
            clientId={chatParams?.clientId}
            clientName={chatParams?.clientName}
            returnTo={chatParams?.from}
          />
        )}
        {displayScreen === 'schedule' && (
          <ScheduleScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {displayScreen === 'nutrition' && (
          <NutritionScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {displayScreen === 'nutrition-calculator' && (
          <NutritionCalculatorScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {displayScreen === 'barcode-scanner' && (
          <BarcodeScannerScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {displayScreen === 'profile' && (
          <ProfileScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {displayScreen === 'coach-dashboard' && (
          <CoachDashboardScreen onNavigate={(screen, params) => navigateWithTransition(screen as Screen, params)} />
        )}
        {displayScreen === 'coach-client-detail' && clientDetailParams && (
          <CoachClientDetailScreen 
            clientId={clientDetailParams.clientId}
            onBack={() => navigateWithTransition('coach-dashboard')}
            onNavigateToNotes={(clientId) => navigateWithTransition('coach-notes', { clientId })}
            onNavigate={(screen, params) => navigateWithTransition(screen as Screen, params)}
          />
        )}
        {displayScreen === 'coach-notes' && notesParams && (
          <CoachNotesScreen 
            clientId={notesParams.clientId}
            onBack={() => navigateWithTransition('coach-dashboard')}
          />
        )}
        {displayScreen === 'assign-client' && (
          <AssignClientScreen 
            onNavigate={(screen) => navigateWithTransition(screen as Screen)}
          />
        )}
        {displayScreen === 'coach-requests' && (
          <CoachRequestsScreen 
            onNavigate={(screen, params) => navigateWithTransition(screen as Screen, params)}
          />
        )}
        {displayScreen === 'coach-selection' && (
          <CoachSelectionScreen 
            onNavigate={(screen) => navigateWithTransition(screen as Screen)}
            onSelectCoach={(coachId) => {
              console.log('Coach selected:', coachId);
              navigateWithTransition('chat');
            }}
          />
        )}
        {displayScreen === 'become-coach' && (
          <BecomeCoachScreen 
            onNavigate={(screen) => navigateWithTransition(screen as Screen)}
          />
        )}
        {displayScreen === 'create-workout-plan' && clientDetailParams && (
          <CreateWorkoutPlanScreen 
            clientId={clientDetailParams.clientId}
            onBack={() => navigateWithTransition('coach-client-detail', clientDetailParams)}
          />
        )}
        {displayScreen === 'client-workout-plans' && clientDetailParams && (
          <ClientWorkoutPlansScreen 
            clientId={clientDetailParams.clientId}
            onBack={() => navigateWithTransition('coach-client-detail', clientDetailParams)}
            onNavigate={(screen, params) => navigateWithTransition(screen as Screen, params)}
          />
        )}
        {displayScreen === 'create-nutrition-plan' && clientDetailParams && (
          <CreateNutritionPlanScreen 
            clientId={clientDetailParams.clientId}
            onBack={() => navigateWithTransition('coach-client-detail', clientDetailParams)}
          />
        )}
        {displayScreen === 'client-progress-analytics' && clientDetailParams && (
          <ClientProgressAnalyticsScreen 
            clientId={clientDetailParams.clientId}
            onBack={() => navigateWithTransition('coach-client-detail', clientDetailParams)}
          />
        )}
        {displayScreen === 'activity-map' && (
          <ActivityMapScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {displayScreen === 'running' && (
          <RunningScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
        {displayScreen === 'music' && (
          <MusicScreen onNavigate={(screen) => navigateWithTransition(screen as Screen)} />
        )}
      </View>

      {/* Persistent Navigation Bar */}
      {user && (() => {
        const isCoachNav = currentMode === 'coach';
        const showNav = isCoachNav
          ? COACH_NAV_SCREENS.has(displayScreen)
          : CLIENT_NAV_SCREENS.has(displayScreen);
        if (!showNav) return null;
        return isCoachNav ? (
          <CoachBottomNavigation
            activeTab={getCoachActiveTab(displayScreen)}
            onTabChange={(tab) => navigateWithTransition((COACH_TAB_TO_SCREEN[tab] || 'coach-dashboard') as Screen)}
          />
        ) : (
          <BottomNavigation
            activeTab={getClientActiveTab(displayScreen)}
            onTabChange={(tab) => navigateWithTransition(tab as Screen)}
          />
        );
      })()}
    </View>
  );
}

export default function App() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <SafeAreaProvider>
        <AuthProvider>
          <ScheduleProvider>
            <NutritionProvider>
              <AppContent />
              <StatusBar style="auto" />
            </NutritionProvider>
          </ScheduleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    ...(Platform.OS === 'web' ? { height: '100vh' as any, maxHeight: '100vh' as any, overflow: 'hidden' as any } : {}),
  },
  screenContent: {
    flex: 1,
    minHeight: 0,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 1000,
  },
});
