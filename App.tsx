import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Quicksand_500Medium, Quicksand_600SemiBold } from '@expo-google-fonts/quicksand';
import './global.css';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ScheduleProvider } from './src/contexts/ScheduleContext';
import { NutritionProvider } from './src/contexts/NutritionContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MindfulnessScreen } from './src/screens/MindfulnessScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ScheduleScreen } from './src/screens/ScheduleScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { NutritionCalculatorScreen } from './src/screens/NutritionCalculatorScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CoachDashboardScreen } from './src/screens/CoachDashboardScreen';
import { CoachClientDetailScreen } from './src/screens/CoachClientDetailScreen';
import { CoachNotesScreen } from './src/screens/CoachNotesScreen';
import { AssignClientScreen } from './src/screens/AssignClientScreen';
import { CoachSelectionScreen } from './src/screens/CoachSelectionScreen';
import { BecomeCoachScreen } from './src/screens/BecomeCoachScreen';
import { colors } from './src/constants/theme';

const { width } = Dimensions.get('window');

type Screen = 'splash' | 'login' | 'register' | 'home' | 'mindfulness' | 'mindfulness-insights' | 'chat' | 'schedule' | 'nutrition' | 'nutrition-calculator' | 'profile' | 'coach-dashboard' | 'coach-client-detail' | 'coach-notes' | 'assign-client' | 'coach-selection' | 'become-coach';

function AppContent() {
  const { user, loading: authLoading, isCoach } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [displayScreen, setDisplayScreen] = useState<Screen>('splash');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);
  const [clientDetailParams, setClientDetailParams] = useState<any>(null);
  const [notesParams, setNotesParams] = useState<any>(null);
  const [chatParams, setChatParams] = useState<any>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [fontsLoaded] = useFonts({
    Poppins_700Bold,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
  });

  const navigateWithTransition = (targetScreen: Screen, params?: any) => {
    console.log('[App] Navigation requested:', targetScreen, params);
    
    if (isTransitioning) {
      console.log('[App] Navigation blocked - transition in progress');
      return;
    }
    
    if (targetScreen === 'coach-client-detail') {
      setClientDetailParams(params);
    } else if (targetScreen === 'coach-notes') {
      setNotesParams(params);
    } else if (targetScreen === 'chat') {
      setChatParams(params);
    }
    
    setIsTransitioning(true);
    
    requestAnimationFrame(() => {
      console.log('[App] Navigating to:', targetScreen);
      setCurrentScreen(targetScreen);
      setDisplayScreen(targetScreen);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    });
  };

  useEffect(() => {
    if (!authLoading && !fontsLoaded) return;
    
    if (!authLoading && fontsLoaded) {
      if (user) {
        const targetScreen = isCoach ? 'coach-dashboard' : 'home';
        
        if (currentScreen === 'splash' || currentScreen === 'login' || currentScreen === 'register') {
          console.log('[App] Initial routing after login:', {
            userId: user.id,
            isCoach,
            targetScreen,
            currentScreen
          });
          setCurrentScreen(targetScreen);
          setDisplayScreen(targetScreen);
          setSplashFinished(true);
        }
        else if (
          (isCoach && currentScreen === 'home') || 
          (!isCoach && currentScreen === 'coach-dashboard')
        ) {
          console.log('[App] � Switching interface based on isCoach change:', {
            userId: user.id,
            isCoach,
            currentScreen,
            targetScreen
          });
          setCurrentScreen(targetScreen);
          setDisplayScreen(targetScreen);
        }
      } else {
        if (currentScreen !== 'splash' && currentScreen !== 'login' && currentScreen !== 'register') {
          navigateWithTransition('login');
        } else if (splashFinished && currentScreen === 'splash') {
          navigateWithTransition('login');
        }
      }
    }
  }, [user, authLoading, splashFinished, fontsLoaded, isCoach]);

  if (!fontsLoaded || authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (currentScreen === 'splash' && !user) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  if (currentScreen === 'splash' && user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      {isTransitioning && (
        <View style={styles.transitionOverlay} pointerEvents="none" />
      )}
      
      <View 
        style={styles.screenContent}
        removeClippedSubviews={isTransitioning}
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
        {displayScreen === 'chat' && (
          <ChatScreen 
            onNavigate={(screen: string, params?: any) => navigateWithTransition(screen as Screen, params)} 
            clientId={chatParams?.clientId}
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
      </View>
    </View>
  );
}

export default function App() {
  return (
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
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 1000,
  },
});
