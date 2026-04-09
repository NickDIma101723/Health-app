import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { analyzeWorkoutWithGemini } from '../lib/gemini';

const { width, height } = Dimensions.get('window');

const S_COLORS = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  accent: '#FF477E', // Vibrant pink
  accentSecondary: '#7C3AED', // Vivid purple
  accentCyan: '#00F0FF', // Neon Cyan
  text: '#1A1A24',
  textDim: '#8A8A9D',
  border: '#EAEDF4',
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const ActivityMapScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [calories, setCalories] = useState(0);
  const [subscription, setSubscription] = useState<number | null>(null);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return; // Do not ask on mount, just check
        let initialLoc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({ latitude: initialLoc.coords.latitude, longitude: initialLoc.coords.longitude });
      } catch(e) {}
    })();
    return () => { if (subscription !== null) navigator.geolocation.clearWatch(subscription); }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking) {
      interval = setInterval(() => setDurationSec(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking]);

  const startTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { alert('Permission required'); return; }
    setDistanceKm(0); setDurationSec(0); setCalories(0); setIsTracking(true); setAiInsight(null);

    const watchId = navigator.geolocation.watchPosition(
      (loc) => {
        const newCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setCurrentLocation(prev => {
          if (prev) {
            const dist = getDistanceFromLatLonInKm(prev.latitude, prev.longitude, newCoord.latitude, newCoord.longitude);
            if (dist > 0.001) {
                setDistanceKm(d => { const nd = d + dist; setCalories(Math.floor(nd * 60)); return nd; });
            }
          }
          return newCoord;
        });
      },
      (error) => console.log(error),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );
    setSubscription(watchId);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (subscription !== null) { 
       navigator.geolocation.clearWatch(subscription); 
       setSubscription(null); 
    }
  };

  const generateGeminiInsight = async () => {
    setIsAnalyzing(true);
    const insight = await analyzeWorkoutWithGemini({
        distance: distanceKm.toFixed(2),
        time: formatTime(durationSec),
        calories: calories,
        pace: calculatePace()
    });
    setAiInsight(insight);
    setIsAnalyzing(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60); 
    const s = seconds % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const calculatePace = () => {
    if (distanceKm < 0.01 || durationSec < 10) return "0'00\"";
    const totalMinutes = durationSec / 60; const paceVal = totalMinutes / distanceKm;
    const paceM = Math.floor(paceVal); const paceS = Math.floor((paceVal - paceM) * 60);
    return `${paceM}'${paceS < 10 ? '0' : ''}${paceS}"`;
  };

  const lat = currentLocation?.latitude || 37.79050;
  const lon = currentLocation?.longitude || -122.4344;
  const bbox = `${lon - 0.01}%2C${lat - 0.01}%2C${lon + 0.01}%2C${lat + 0.01}`;
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        {/* Lighter, saturated map for web without ugly inverts */}
        <iframe width="100%" height="100%" frameBorder="0" scrolling="no" src={iframeSrc} style={{ border: 0, filter: 'saturate(1.2)' }} />
      </View>

      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
          <Ionicons name="chevron-back" size={24} color={S_COLORS.text} style={{marginLeft: -2}} />
        </TouchableOpacity>
        
        {isTracking && (
          <View style={styles.trackingIndicator}>
            <View style={styles.trackingDot} />
            <Text style={styles.trackingText}>TRACKING</Text>
          </View>
        )}
      </View>

      {/* Vibrant Bottom Sheet Panel */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleBar} />
        
        {/* Main Stat */}
        <View style={styles.mainStatContainer}>
          <Text style={styles.mainDistance}>{distanceKm.toFixed(2)}</Text>
          <Text style={styles.mainLabel}>Kilometers</Text>
        </View>

        {/* Secondary Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statColumn}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(0, 136, 255, 0.1)' }]}>
                <MaterialIcons name="timer" size={18} color="#0088FF" />
            </View>
            <Text style={styles.statValue}>{formatTime(durationSec)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statColumn}>
             <View style={[styles.iconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.1)' }]}>
                <MaterialIcons name="speed" size={18} color={S_COLORS.accentSecondary} />
            </View>
            <Text style={styles.statValue}>{calculatePace()}</Text>
            <Text style={styles.statLabel}>Avg Pace</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statColumn}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 138, 0, 0.1)' }]}>
                <MaterialIcons name="local-fire-department" size={18} color="#FF8A00" />
            </View>
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>

        {/* AI Insight Section (Visible after workout) */}
        {!isTracking && distanceKm > 0 && (
          <View style={styles.aiSection}>
            {!aiInsight && !isAnalyzing && (
              <TouchableOpacity style={{width: '100%'}} activeOpacity={0.9} onPress={generateGeminiInsight}>
                <LinearGradient 
                   colors={['#7C3AED', '#FF477E']}
                   start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                   style={styles.aiButton}
                >
                  <FontAwesome5 name="magic" size={16} color="#FFF" />
                  <Text style={styles.aiButtonText}>AI Coach Analysis</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {isAnalyzing && (
              <View style={styles.aiLoader}>
                <ActivityIndicator color={S_COLORS.accentSecondary} />
                <Text style={styles.aiLoaderText}>Gemini is analyzing your run...</Text>
              </View>
            )}
            {aiInsight && (
              <View style={styles.aiInsightBox}>
                <View style={styles.aiHeader}>
                    <FontAwesome5 name="robot" size={18} color={S_COLORS.accentSecondary} />
                    <Text style={styles.aiTitle}>Coach Insight</Text>
                </View>
                <Text style={styles.aiInsightText}>{aiInsight}</Text>
              </View>
            )}
          </View>
        )}

        {/* Primary Action Button */}
        <TouchableOpacity 
          style={styles.actionShadow}
          activeOpacity={0.9}
          onPress={isTracking ? stopTracking : startTracking}
        >
          <LinearGradient 
             colors={isTracking ? ['#FF477E', '#FF512F'] : ['#00F0FF', '#0088FF']}
             start={{x: 0, y: 0}} end={{x: 1, y: 0}}
             style={styles.actionButton}
          >
             <Text style={styles.actionButtonText}>
                {isTracking ? "FINISH WORKOUT" : (distanceKm > 0 ? "START NEW" : "START WORKOUT")}
             </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: S_COLORS.bg },
  topHeader: { position: 'absolute', top: 40, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: S_COLORS.card, alignItems: 'center', justifyContent: 'center', shadowColor: S_COLORS.text, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  
  trackingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: S_COLORS.card, paddingHorizontal: 16, borderRadius: 24, shadowColor: S_COLORS.text, shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: S_COLORS.accent, marginRight: 8 },
  trackingText: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: S_COLORS.text, letterSpacing: 1 },

  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: S_COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 16,
    shadowColor: S_COLORS.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: { width: 36, height: 4, backgroundColor: S_COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  
  mainStatContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 12, gap: 6 },
  mainDistance: { fontFamily: 'Poppins_700Bold', fontSize: 44, color: S_COLORS.text, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  mainLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: S_COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1 },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 12, backgroundColor: S_COLORS.bg, borderRadius: 16, paddingVertical: 10 },
  statColumn: { alignItems: 'center', flex: 1, gap: 0 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  divider: { width: 1, height: 28, backgroundColor: S_COLORS.border },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: S_COLORS.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: 'Poppins_500Medium', fontSize: 10, color: S_COLORS.textDim },
  
  aiSection: { marginBottom: 12 },
  aiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14, gap: 6 },
  aiButtonText: { fontFamily: 'Poppins_700Bold', color: '#FFF', fontSize: 14 },
  aiLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8, backgroundColor: S_COLORS.bg, borderRadius: 14 },
  aiLoaderText: { fontFamily: 'Poppins_500Medium', color: S_COLORS.textDim, fontSize: 12 },
  aiInsightBox: { backgroundColor: S_COLORS.bg, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: S_COLORS.border },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  aiTitle: { fontFamily: 'Poppins_700Bold', color: S_COLORS.text, fontSize: 14 },
  aiInsightText: { fontFamily: 'Poppins_400Regular', color: S_COLORS.text, fontSize: 12, lineHeight: 18 },

  actionShadow: { shadowColor: S_COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
  actionButton: { width: '100%', paddingVertical: 14, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  actionButtonText: { fontFamily: 'Poppins_700Bold', color: '#FFFFFF', fontSize: 14, letterSpacing: 1 },
});
