import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  ImageBackground,
  StatusBar,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { BottomNavigation } from '../components';
import { useHealthMetrics, useUserGoals, useNotifications, useNutritionAdapter, useScheduleAdapter } from '../hooks';
import { supabase } from '../lib/supabase';
import { MiniMap } from '../components/MiniMap';

const { width, height } = Dimensions.get('window');

// --- LOCAL "VIBRANT AESTHETIC" THEME OVERRIDES ---
const S_COLORS = {
  bg: '#F4F6FB', // Soft pastel blue/grey
  card: '#FFFFFF',
  cardDark: '#2D1B69', // Deep vibrant violet
  accent: '#FF477E', // Vibrant pink
  accentSecondary: '#7C3AED', // Vivid purple
  accentCyan: '#00F0FF', // Neon Cyan
  text: '#1A1A24',
  textLight: '#FFFFFF',
  textDim: '#8A8A9D',
  border: '#EAEDF4',
};

const S_FONTS = {
  headline: {
    fontSize: 32,
    fontWeight: '700' as "700",
    color: S_COLORS.text,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '600' as "600",
    color: S_COLORS.textDim,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 16,
    color: S_COLORS.text,
    fontWeight: '400' as "400",
  },
  giant: {
    fontSize: 56,
    fontWeight: '800' as "800",
    color: S_COLORS.text,
    letterSpacing: -2,
    marginTop: 0,
  },
};

interface HomeScreenProps {
  onNavigate?: (screen: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { metrics, loading: metricsLoading } = useHealthMetrics();
  const { goals } = useUserGoals();
  const { getDailyNutrition } = useNutritionAdapter();
  const { getActivitiesForDate } = useScheduleAdapter();
  
  const today = new Date().toISOString().split('T')[0];
  const todayNutrition = getDailyNutrition(today);
  const todayActivities = getActivitiesForDate(today);
  
  const fadeAnim = useRef(new Animated.Value(1)).current; // instant instead of 0
  const slideAnim = useRef(new Animated.Value(0)).current; 
  const cardStagger = useRef([0,1,2,3].map(() => new Animated.Value(0))).current; 

  const [profileName, setProfileName] = useState<string>('ATHLETE');

  useEffect(() => {
    Animated.parallel([
       Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
       Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
       Animated.stagger(120, cardStagger.map(anim => 
          Animated.timing(anim, { toValue: 0, duration: 700, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
       ))
    ]).start();

    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).single();
      if (data?.full_name) setProfileName(data.full_name.toUpperCase());
    };
    fetchProfile();
  }, [user]);

  const steps = metrics?.steps || 0;
  const stepGoal = goals?.steps_daily || 10000;
  const stepProgress = Math.min((steps / stepGoal) * 100, 100);
  
  const cals = metrics?.calories_burned || 0;
  
  // Custom mock data for the visual
  const heartRate = 101; 
  const weight = 72.2;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
          {/* Header: Clean & Aesthetic Greeting */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                 <Text style={{ fontFamily: 'Quicksand_600SemiBold', fontSize: 13, color: S_COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                 </Text>
                 <Text style={[S_FONTS.headline, { fontSize: 32, letterSpacing: -0.8 }]}>
                    Hello, {profileName.split(' ')[0][0] + profileName.split(' ')[0].substring(1).toLowerCase()}.
                 </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                 <TouchableOpacity style={[styles.iconButton, { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFF', shadowOpacity: 0.04, shadowRadius: 12 }]}>
                    <MaterialIcons name="notifications-none" size={24} color={S_COLORS.text} />
                    <View style={[styles.notificationDot, { top: 12, right: 14, width: 8, height: 8 }]} />
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.profileImageContainer, { padding: 3, shadowOpacity: 0.08, shadowRadius: 14, elevation: 5 }]}>
                   <ImageBackground 
                      source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }} 
                      style={{ width: 44, height: 44, backgroundColor: '#E5E5EA', borderRadius: 22 }}
                      imageStyle={{ borderRadius: 22 }}
                   />
                 </TouchableOpacity>
              </View>
          </Animated.View>

          {/* Main Title (Animated) - Premium Aesthetic */}
          <Animated.View style={[styles.titleContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], marginBottom: 32 }]}>
             <Text style={[S_FONTS.headline, { fontSize: 36, lineHeight: 42, color: S_COLORS.text }]}>Find your</Text>
             <Text style={[S_FONTS.headline, { fontSize: 36, lineHeight: 42, color: S_COLORS.accentSecondary }]}>rhythm today.</Text>
          </Animated.View>

          {/* Featured Card: Workout Progress (Vibrant Gradient) */}
          <Animated.View style={{ transform: [{ translateY: cardStagger[0] }] }}>
            <TouchableOpacity style={[styles.featuredCard, styles.shadowGlow]} activeOpacity={0.9} onPress={() => onNavigate?.('schedule')}>
               <LinearGradient
                  colors={['#7C3AED', '#FF477E']} // Purple to Pink
                  start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                  style={StyleSheet.absoluteFill}
               />
               <View style={styles.glassLayer} />
               <View>
                  <Text style={styles.cardLabelLight}>Weekly Goal</Text>
                  <Text style={styles.cardValueLight}>10 / 20 Hours</Text>
                  
                  {/* Mini graph lines */}
                  <View style={{flexDirection: 'row', gap: 6, marginTop: 14, alignItems: 'flex-end', height: 24}}>
                      {[30, 50, 40, 70, 50, 80, 60].map((h, i) => (
                          <View key={i} style={{width: 5, height: `${h}%`, backgroundColor: i===5 ? '#FFF' : 'rgba(255,255,255,0.4)', borderRadius: 3}} />
                      ))}
                  </View>
               </View>
               {/* Circular Progress Mock */}
               <View style={styles.progressCircle}>
                   <MaterialIcons name="local-fire-department" size={28} color="#FFF" />
               </View>
            </TouchableOpacity>
          </Animated.View>


          {/* Horizontal Scroll Chips */}
          <Animated.View style={{ transform: [{ translateY: cardStagger[0] }] }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{paddingHorizontal: 24, gap: 12}}>
               {['All', 'Meditation', 'Sports', 'Mindfulness', 'Running'].map((chip, i) => (
                 <TouchableOpacity key={chip} style={[styles.chip, i===0 && styles.activeChip]}>
                    <Text style={[styles.chipText, i===0 && styles.activeChipText]}>{chip}</Text>
                 </TouchableOpacity>
               ))}
            </ScrollView>
          </Animated.View>

          {/* Section: Daily Activities */}
          <Animated.Text style={[S_FONTS.subhead, { marginTop: 32, marginBottom: 16, fontSize: 18, color: S_COLORS.text, opacity: fadeAnim }]}>Daily Insights</Animated.Text>
          
          <View style={{flexDirection: 'row', gap: 16, marginBottom: 16}}>
             {/* Left Col (Stagger 1) */}
             <Animated.View style={{flex: 1, gap: 16, transform: [{ translateY: cardStagger[1] }] }}>
                {/* Steps Card */}
                <View style={styles.bentoCardWhite}>
                   <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                      <View style={styles.iconCircleBlue}>
                        <MaterialIcons name="directions-walk" size={20} color="#0088FF" />
                      </View>
                   </View>
                   <Text style={[S_FONTS.headline, {fontSize: 32, marginTop: 12}]}>{steps > 1000 ? (steps/1000).toFixed(1) : steps}</Text>
                   <Text style={styles.bentoSub}>Steps {steps > 1000 ? 'k' : ''}</Text>
                   
                   {/* Vibrant progress bar */}
                   <View style={{height: 6, backgroundColor: '#EAEDF4', borderRadius: 3, marginTop: 12, overflow: 'hidden'}}>
                       <LinearGradient colors={['#00F0FF', '#0088FF']} start={{x:0, y:0}} end={{x:1, y:0}} style={{height: 6, width: '65%'}} />
                   </View>
                </View>

                 {/* Weight Card */}
                <View style={styles.bentoCardWhite}>
                   <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <View style={styles.iconCircleOrange}>
                          <MaterialIcons name="fitness-center" size={18} color="#FF8A00" />
                      </View>
                      <View style={[styles.arrowBadge, {backgroundColor: '#FFF2E5'}]}>
                         <MaterialIcons name="arrow-outward" size={14} color="#FF8A00" />
                      </View>
                   </View>
                   <Text style={[S_FONTS.headline, {fontSize: 24, marginTop: 16}]}>{weight} <Text style={{fontSize: 14, color: S_COLORS.textDim}}>kg</Text></Text>
                   <Text style={[styles.bentoSub, {color: S_COLORS.textDim, marginTop: 4}]}>Stable</Text>
                </View>
             </Animated.View>

             {/* Right Col (Stagger 2) */}
             <Animated.View style={{flex: 1, gap: 16, transform: [{ translateY: cardStagger[2] }] }}>
                 {/* Heart Rate Card (Vibrant Orange/Pink) */}
                <View style={styles.healthCardContainer}>
                    <LinearGradient
                       colors={['#FF512F', '#DD2476']} // Sunset Vibrant
                       style={StyleSheet.absoluteFill}
                       start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                    />
                    <View style={styles.glassLayerSecondary} />
                    <View style={styles.bentoCardContent}>
                       <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                          <View style={styles.glassIcon}>
                              <MaterialIcons name="favorite" size={22} color="#FFF" />
                          </View>
                          <View style={[styles.arrowBadge, {backgroundColor: 'rgba(255,255,255,0.2)'}]}>
                             <MaterialIcons name="arrow-outward" size={14} color="#FFF" />
                          </View>
                       </View>
                       <View>
                           <Text style={[S_FONTS.headline, {fontSize: 32, marginTop: 16, color: '#FFF'}]}>{heartRate}<Text style={{fontSize: 16, fontWeight: '500', color: 'rgba(255,255,255,0.7)'}}> bpm</Text></Text>
                           <View style={[styles.badgePill, {backgroundColor: 'rgba(255,255,255,0.25)'}]}>
                               <Text style={styles.badgeText}>Healthy Zone</Text>
                           </View>
                       </View>
                       
                       <View style={{position: 'absolute', right: -25, bottom: -25, opacity: 0.15}}>
                          <MaterialIcons name="favorite" size={140} color="#FFF" />
                       </View>
                    </View>
                </View>

                {/* Sleep Widget */}
                <View style={styles.bentoCardWhite}>
                   <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                      <View style={[styles.iconCircleBlue, {backgroundColor: '#F3E8FF'}]}>
                          <MaterialIcons name="nights-stay" size={18} color="#7C3AED" />
                      </View>
                      <Text style={{color: S_COLORS.textDim, fontWeight: '700', fontSize: 13}}>7h 20m</Text>
                   </View>
                   <View style={{marginTop: 16}}>
                      <Text style={[S_FONTS.headline, {fontSize: 20}]}>Deep Sleep</Text>
                      <Text style={[styles.bentoSub, {color: S_COLORS.textDim, marginTop: 4}]}>Restful night</Text>
                   </View>
                   <View style={{flexDirection: 'row', gap: 4, marginTop: 12}}>
                      {[1, 2, 3, 4, 5].map(i => (
                         <View key={i} style={{flex: 1, height: 4, backgroundColor: i < 5 ? '#7C3AED' : '#EAEDF4', borderRadius: 2}} />
                      ))}
                   </View>
                </View>
             </Animated.View>
          </View>

          {/* Body Composition (Wide Bright Card) */}
          <Animated.View style={{ transform: [{ translateY: cardStagger[3] }] }}>
              <View style={[styles.wideCardVibrant, { marginTop: 16 }]}>
                 <LinearGradient
                    colors={['#2D1B69', '#1A1040']} // Deep Violet
                    start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                    style={[StyleSheet.absoluteFill, {borderRadius: 32}]}
                 />
                 <View style={{flex: 1, zIndex: 1}}>
                     <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8}}>
                        <View style={styles.glassIconSmall}>
                          <MaterialIcons name="accessibility-new" size={16} color="#00F0FF" />
                        </View>
                        <Text style={{color: '#E0E7FF', fontWeight: '600', fontSize: 13}}>Body Composition</Text>
                     </View>
                     <Text style={{color: '#FFF', fontSize: 32, fontWeight: '800', letterSpacing: -0.5}}>87.9%</Text>
                     <View style={styles.badgePillLime}>
                        <Text style={styles.badgeTextDark}>Gaining Muscle</Text>
                     </View>
                 </View>
                 
                 <View style={styles.chartArea}>
                    {[40, 60, 50, 80, 70].map((h, i) => (
                        <View key={i} style={[styles.bar, {
                            height: `${h}%`, 
                            backgroundColor: i === 4 ? '#00F0FF' : 'rgba(255,255,255,0.15)' 
                        }]} />
                    ))}
                 </View>
                 <View style={{position: 'absolute', top: -50, right: -20, opacity: 0.4}}>
                    <View style={{width: 150, height: 150, borderRadius: 75, backgroundColor: S_COLORS.accentSecondary, filter: 'blur(40px)'}} />
                 </View>
              </View>

              {/* Map & Route Tracker */}
              <View style={{ marginBottom: 32 }}>
                 <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <Text style={[S_FONTS.subhead, { fontSize: 18, color: S_COLORS.text }]}>Recent Activity</Text>
                    <Text style={{color: S_COLORS.accent, fontWeight: '700', fontSize: 14}}>View More</Text>
                 </View>
                 
                 <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => onNavigate?.('activity-map')}
                    style={[styles.bentoCardWhite, { padding: 0, borderRadius: 28, overflow: 'hidden', height: 180 }]}
                 >
                    <MiniMap />
                    
                    {/* Dark gradient fade for text */}
                    <LinearGradient
                       colors={['transparent', 'rgba(0,0,0,0.85)']}
                       style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, padding: 24, justifyContent: 'flex-end' }}
                    >
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <View>
                             <Text style={{ fontFamily: 'Poppins_700Bold', color: '#FFF', fontSize: 18 }}>Morning Run</Text>
                             <Text style={{ fontFamily: 'Quicksand_600SemiBold', color: '#EBEBF5', fontSize: 13, marginTop: 4 }}>
                                5.2 km • 45 min • 420 Cal
                             </Text>
                          </View>
                          <View style={{ backgroundColor: S_COLORS.accent, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                             <MaterialIcons name="arrow-forward-ios" size={14} color="#FFF" style={{ marginLeft: 4 }} />
                          </View>
                       </View>
                    </LinearGradient>
                 </TouchableOpacity>
              </View>

              {/* Weekly Goal Progress (In case you forgot) */}
              <View style={{ marginBottom: 120 }}>
                 <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                    <Text style={[S_FONTS.subhead, { fontSize: 18, color: S_COLORS.text }]}>Weekly Goals</Text>
                    <Text style={{color: S_COLORS.textDim, fontWeight: '700', fontSize: 14}}>3/5 Days</Text>
                 </View>
                 <View style={[styles.bentoCardWhite, { padding: 24, borderRadius: 28 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                       <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 71, 126, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                          <FontAwesome5 name="fire" size={20} color={S_COLORS.accent} />
                       </View>
                       <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 16, color: S_COLORS.text }}>Calorie Burn</Text>
                          <Text style={{ fontFamily: 'Quicksand_500Medium', fontSize: 13, color: S_COLORS.textDim }}>You're 120 kcal behind daily target format</Text>
                       </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={{ width: '100%', height: 10, backgroundColor: '#F0F0F5', borderRadius: 5, overflow: 'hidden' }}>
                       <Animated.View style={{ width: '65%', height: '100%', backgroundColor: S_COLORS.accent, borderRadius: 5 }} />
                    </View>
                 </View>
              </View>
          </Animated.View>

          <View style={{height: 100}} /> 
        </ScrollView>
      </SafeAreaView>

      <View style={styles.bottomNavContainer}>
        <BottomNavigation activeTab="home" onTabChange={(tab: any) => onNavigate?.(tab)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: S_COLORS.bg,
  },
  safeArea: {
    flex: 1,
    paddingTop: 10,
  },
  header: {
    paddingBottom: 24,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileImageContainer: {
    padding: 3,
    borderRadius: 28,
    backgroundColor: '#FFF',
    shadowColor: S_COLORS.accentSecondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  profileImage: {
    width: 46,
    height: 46,
    backgroundColor: '#E5E5EA',
    borderRadius: 23,
  },
  greetingSub: {
    fontSize: 13,
    color: S_COLORS.textDim,
    fontWeight: '600',
  },
  greetingName: {
    fontSize: 18,
    color: S_COLORS.text,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 46, 
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  notificationDot: {
      position: 'absolute',
      top: 12,
      right: 14,
      width: 10, 
      height: 10, 
      borderRadius: 5, 
      backgroundColor: S_COLORS.accent,
      borderWidth: 2,
      borderColor: '#FFF'
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  titleContainer: {
    marginBottom: 32,
  },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    marginTop: 18,
    shadowColor: S_COLORS.accentSecondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  avatarStack: {
    flexDirection: 'row',
    width: 44,
    height: 26,
    alignItems: 'center',
  },
  miniAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#FFF',
    position: 'absolute',
  },
  socialText: {
    fontSize: 13,
    fontWeight: '700',
    color: S_COLORS.text,
    marginLeft: 6,
  },
  featuredCard: {
    borderRadius: 36,
    padding: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    overflow: 'hidden', 
    height: 160, 
  },
  shadowGlow: {
    shadowColor: S_COLORS.accentSecondary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 8,
  },
  glassLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  glassLayerSecondary: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  cardLabelLight: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  cardValueLight: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipScroll: {
    marginHorizontal: -24,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  activeChip: {
    backgroundColor: S_COLORS.text,
  },
  chipText: {
    fontSize: 15,
    fontWeight: '700',
    color: S_COLORS.textDim,
  },
  activeChipText: {
    color: '#FFF', 
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  bentoCardWhite: {
    backgroundColor: '#FFF',
    borderRadius: 32,
    padding: 24,
    justifyContent: 'space-between',
    minHeight: 172,
    shadowColor: '#0A0A14',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.03,
    shadowRadius: 24,
    elevation: 3,
  },
  healthCardContainer: {
    borderRadius: 32,
    overflow: 'hidden',
    height: 172,
    shadowColor: S_COLORS.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  bentoCardContent: {
      flex: 1,
      padding: 24,
      justifyContent: 'space-between',
      zIndex: 1,
  },
  iconCircleBlue: {
     width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5F3FF', alignItems: 'center', justifyContent: 'center'
  },
  iconCircleOrange: {
     width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF2E5', alignItems: 'center', justifyContent: 'center'
  },
  glassIcon: {
     width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center'
  },
  glassIconSmall: {
     width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0, 240, 255, 0.15)', alignItems: 'center', justifyContent: 'center'
  },
  bentoSub: {
    fontSize: 13,
    fontWeight: '600',
    color: S_COLORS.textDim,
  },
  arrowBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  wideCardVibrant: {
    borderRadius: 36,
    padding: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 164,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: S_COLORS.cardDark,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 28,
    elevation: 8,
  },
  badgePillLime: {
    backgroundColor: S_COLORS.accentCyan,
    paddingHorizontal: 14,
    paddingVertical: 6, 
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  badgeTextDark: {
    color: S_COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 8,
    zIndex: 1,
  },
  bar: {
    width: 14,
    borderRadius: 7,
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    width: 160,
    shadowColor: '#0A0A14',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 20, 
  },
  actionIconPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: S_COLORS.text,
    marginBottom: 4,
  },
  actionSub: {
    fontSize: 13,
    fontWeight: '600',
    color: S_COLORS.textDim,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  }
});
