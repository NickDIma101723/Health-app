import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { MaterialIcons, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import Mapbox from '@rnmapbox/maps';
import { analyzeWorkoutWithGemini } from '../lib/gemini';
import { MAPBOX_TOKEN, getMapStyle } from '../lib/mapStyle';

Mapbox.setAccessToken(MAPBOX_TOKEN);

const { width, height } = Dimensions.get('window');

const S_COLORS = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  accent: '#FF477E',
  accentSecondary: '#7C3AED',
  accentCyan: '#00F0FF',
  text: '#1A1A24',
  textDim: '#8A8A9D',
  border: '#EAEDF4',
};

type ActivityType = 'run' | 'walk' | 'cycle';

const ACTIVITY_CONFIG: Record<ActivityType, { icon: string; label: string; caloriesPerKm: number; iconFamily: 'MaterialIcons' | 'MaterialCommunityIcons' }> = {
  run: { icon: 'directions-run', label: 'Run', caloriesPerKm: 65, iconFamily: 'MaterialIcons' },
  walk: { icon: 'walk', label: 'Walk', caloriesPerKm: 45, iconFamily: 'MaterialCommunityIcons' },
  cycle: { icon: 'bike', label: 'Cycle', caloriesPerKm: 30, iconFamily: 'MaterialCommunityIcons' },
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
  const [isPaused, setIsPaused] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [calories, setCalories] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [lastAltitude, setLastAltitude] = useState<number | null>(null);
  const [splits, setSplits] = useState<number[]>([]);
  const [lastSplitKm, setLastSplitKm] = useState(0);
  const [lastSplitTime, setLastSplitTime] = useState(0);
  const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const mapRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSplits, setShowSplits] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let initialLoc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({ latitude: initialLoc.coords.latitude, longitude: initialLoc.coords.longitude });
      } catch (e) {}
    })();
    return () => { if (subscription) subscription.remove(); };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && !isPaused) {
      interval = setInterval(() => setDurationSec(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

  // Track splits (per-km)
  useEffect(() => {
    const currentWholeKm = Math.floor(distanceKm);
    const lastWholeKm = Math.floor(lastSplitKm);
    if (currentWholeKm > lastWholeKm && currentWholeKm > 0) {
      const splitTime = durationSec - lastSplitTime;
      setSplits(prev => [...prev, splitTime]);
      setLastSplitKm(currentWholeKm);
      setLastSplitTime(durationSec);
    }
  }, [distanceKm]);

  const startTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { alert('Location permission is required to track your workout'); return; }
    
    setDistanceKm(0); setDurationSec(0); setCalories(0); setCurrentSpeedKmh(0);
    setElevationGain(0); setLastAltitude(null); setSplits([]); setLastSplitKm(0); setLastSplitTime(0);
    setIsTracking(true); setIsPaused(false); setAiInsight(null); setRouteCoordinates([]);
    setIsFollowing(true); setShowSplits(false);

    if (currentLocation) setRouteCoordinates([currentLocation]);

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1500, distanceInterval: 2 },
      (loc) => {
        if (isPaused) return;
        const newCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        const speed = loc.coords.speed;
        const altitude = loc.coords.altitude;

        // Current speed
        if (speed !== null && speed >= 0) {
          setCurrentSpeedKmh(speed * 3.6);
        }

        // Elevation
        if (altitude !== null) {
          setLastAltitude(prev => {
            if (prev !== null && altitude > prev) {
              setElevationGain(g => g + (altitude - prev));
            }
            return altitude;
          });
        }

        setCurrentLocation(newCoord);
        setRouteCoordinates(prev => {
          const last = prev[prev.length - 1];
          if (last) {
            const dist = getDistanceFromLatLonInKm(last.latitude, last.longitude, newCoord.latitude, newCoord.longitude);
            if (dist > 0.001) {
              setDistanceKm(d => {
                const nd = d + dist;
                setCalories(Math.floor(nd * ACTIVITY_CONFIG[activityType].caloriesPerKm));
                return nd;
              });
              return [...prev, newCoord];
            }
          }
          return prev;
        });

        if (isFollowing) {
          cameraRef.current?.setCamera({
            centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
            zoomLevel: 17,
            animationDuration: 800,
            animationMode: 'flyTo',
          });
        }
      }
    );
    setSubscription(sub);
  };

  const pauseTracking = () => {
    setIsPaused(true);
    if (subscription) { subscription.remove(); setSubscription(null); }
  };

  const resumeTracking = async () => {
    setIsPaused(false);
    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1500, distanceInterval: 2 },
      (loc) => {
        const newCoord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        const speed = loc.coords.speed;
        const altitude = loc.coords.altitude;
        if (speed !== null && speed >= 0) setCurrentSpeedKmh(speed * 3.6);
        if (altitude !== null) {
          setLastAltitude(prev => {
            if (prev !== null && altitude > prev) setElevationGain(g => g + (altitude - prev));
            return altitude;
          });
        }
        setCurrentLocation(newCoord);
        setRouteCoordinates(prev => {
          const last = prev[prev.length - 1];
          if (last) {
            const dist = getDistanceFromLatLonInKm(last.latitude, last.longitude, newCoord.latitude, newCoord.longitude);
            if (dist > 0.001) {
              setDistanceKm(d => { const nd = d + dist; setCalories(Math.floor(nd * ACTIVITY_CONFIG[activityType].caloriesPerKm)); return nd; });
              return [...prev, newCoord];
            }
          }
          return prev;
        });
        if (isFollowing) {
          cameraRef.current?.setCamera({
            centerCoordinate: [loc.coords.longitude, loc.coords.latitude],
            zoomLevel: 17, animationDuration: 800, animationMode: 'flyTo',
          });
        }
      }
    );
    setSubscription(sub);
  };

  const stopTracking = () => {
    setIsTracking(false); setIsPaused(false);
    if (subscription) { subscription.remove(); setSubscription(null); }
    // Fit route in view
    if (routeCoordinates.length >= 2) {
      const lngs = routeCoordinates.map(c => c.longitude);
      const lats = routeCoordinates.map(c => c.latitude);
      const pad = 0.002;
      cameraRef.current?.fitBounds(
        [Math.min(...lngs) - pad, Math.min(...lats) - pad],
        [Math.max(...lngs) + pad, Math.max(...lats) + pad],
        60, 600
      );
      setIsFollowing(false);
    }
  };

  const centerOnMe = useCallback(() => {
    if (currentLocation) {
      setIsFollowing(true);
      cameraRef.current?.setCamera({
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 17, animationDuration: 500, animationMode: 'flyTo',
      });
    }
  }, [currentLocation]);

  const generateGeminiInsight = async () => {
    setIsAnalyzing(true);
    const insight = await analyzeWorkoutWithGemini({
      distance: distanceKm.toFixed(2),
      time: formatTime(durationSec),
      calories,
      pace: calculatePace(),
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

  const formatSplitTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}'${s < 10 ? '0' : ''}${s}"`;
  };

  const calculatePace = () => {
    if (distanceKm < 0.01 || durationSec < 10) return "0'00\"";
    const totalMinutes = durationSec / 60;
    const paceVal = totalMinutes / distanceKm;
    const paceM = Math.floor(paceVal);
    const paceS = Math.floor((paceVal - paceM) * 60);
    return `${paceM}'${paceS < 10 ? '0' : ''}${paceS}"`;
  };

  const routeGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: routeCoordinates.length >= 2 ? [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: routeCoordinates.map(c => [c.longitude, c.latitude]),
      },
    }] : [],
  };

  const startPoint = routeCoordinates.length > 0 ? routeCoordinates[0] : null;
  const endPoint = !isTracking && routeCoordinates.length > 1 ? routeCoordinates[routeCoordinates.length - 1] : null;

  const ActivityIcon = ({ type, size, color }: { type: ActivityType; size: number; color: string }) => {
    const cfg = ACTIVITY_CONFIG[type];
    if (cfg.iconFamily === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={cfg.icon as any} size={size} color={color} />;
    return <MaterialIcons name={cfg.icon as any} size={size} color={color} />;
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        styleURL={getMapStyle()}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
        onTouchStart={() => isTracking && setIsFollowing(false)}
      >
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={currentLocation ? {
            centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
            zoomLevel: 16,
          } : undefined}
        />
        <Mapbox.LocationPuck puckBearingEnabled puckBearing="heading" />

        {/* Route line */}
        {routeCoordinates.length >= 2 && (
          <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
            <Mapbox.LineLayer
              id="routeLineGlow"
              style={{ lineColor: S_COLORS.accentSecondary, lineWidth: 12, lineOpacity: 0.15, lineCap: 'round', lineJoin: 'round' }}
              belowLayerID="routeLine"
            />
            <Mapbox.LineLayer
              id="routeLine"
              style={{ lineColor: S_COLORS.accentSecondary, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
            />
          </Mapbox.ShapeSource>
        )}

        {/* Start marker */}
        {startPoint && (
          <Mapbox.PointAnnotation id="startMarker" coordinate={[startPoint.longitude, startPoint.latitude]}>
            <View style={styles.markerStart}>
              <MaterialIcons name="play-arrow" size={14} color="#FFF" />
            </View>
            <Mapbox.Callout title="Start" />
          </Mapbox.PointAnnotation>
        )}

        {/* End marker */}
        {endPoint && (
          <Mapbox.PointAnnotation id="endMarker" coordinate={[endPoint.longitude, endPoint.latitude]}>
            <View style={styles.markerEnd}>
              <MaterialIcons name="flag" size={14} color="#FFF" />
            </View>
            <Mapbox.Callout title="Finish" />
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      {/* Top header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
          <Ionicons name="chevron-back" size={24} color={S_COLORS.text} style={{ marginLeft: -2 }} />
        </TouchableOpacity>

        {isTracking && (
          <View style={[styles.trackingIndicator, isPaused && styles.trackingPaused]}>
            <View style={[styles.trackingDot, isPaused && { backgroundColor: '#FF8A00' }]} />
            <Text style={styles.trackingText}>{isPaused ? 'PAUSED' : 'TRACKING'}</Text>
          </View>
        )}
      </View>

      {/* Activity type selector (only before tracking) */}
      {!isTracking && distanceKm === 0 && (
        <View style={styles.activitySelector}>
          {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={[styles.activityChip, activityType === type && styles.activityChipActive]}
              onPress={() => setActivityType(type)}
              activeOpacity={0.8}
            >
              <ActivityIcon type={type} size={18} color={activityType === type ? '#FFF' : S_COLORS.textDim} />
              <Text style={[styles.activityChipText, activityType === type && styles.activityChipTextActive]}>
                {ACTIVITY_CONFIG[type].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Center on me button */}
      {isTracking && !isFollowing && (
        <TouchableOpacity style={styles.centerButton} onPress={centerOnMe} activeOpacity={0.85}>
          <MaterialIcons name="my-location" size={22} color={S_COLORS.accentSecondary} />
        </TouchableOpacity>
      )}

      {/* Live pace badge while tracking */}
      {isTracking && !isPaused && (
        <View style={styles.livePaceBadge}>
          <LinearGradient colors={['#7C3AED', '#FF477E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.livePaceGradient}>
            <MaterialIcons name="speed" size={16} color="#FFF" />
            <Text style={styles.livePaceText}>{currentSpeedKmh.toFixed(1)} km/h</Text>
          </LinearGradient>
        </View>
      )}

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.handleBar} />

        {/* Distance + timer combo */}
        <View style={styles.distanceHero}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.distanceNumber}>{distanceKm.toFixed(2)}</Text>
            <View style={styles.distanceUnitRow}>
              <View style={styles.distanceDot} />
              <Text style={styles.distanceUnit}>km</Text>
            </View>
          </View>
          {isTracking && (
            <View style={styles.liveTimerBox}>
              <MaterialIcons name="timer" size={16} color={isPaused ? '#FF8A00' : '#0088FF'} />
              <Text style={[styles.liveTimerText, isPaused && { color: '#FF8A00' }]}>{formatTime(durationSec)}</Text>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <LinearGradient colors={['rgba(0,136,255,0.12)', 'rgba(0,136,255,0.04)']} style={styles.statPillGrad}>
              <MaterialIcons name="timer" size={16} color="#0088FF" />
              <Text style={styles.statPillValue}>{formatTime(durationSec)}</Text>
              <Text style={styles.statPillLabel}>Time</Text>
            </LinearGradient>
          </View>
          <View style={styles.statPill}>
            <LinearGradient colors={['rgba(124,58,237,0.12)', 'rgba(124,58,237,0.04)']} style={styles.statPillGrad}>
              <MaterialIcons name="speed" size={16} color={S_COLORS.accentSecondary} />
              <Text style={styles.statPillValue}>{calculatePace()}</Text>
              <Text style={styles.statPillLabel}>Avg Pace</Text>
            </LinearGradient>
          </View>
          <View style={styles.statPill}>
            <LinearGradient colors={['rgba(255,138,0,0.12)', 'rgba(255,138,0,0.04)']} style={styles.statPillGrad}>
              <MaterialIcons name="local-fire-department" size={16} color="#FF8A00" />
              <Text style={styles.statPillValue}>{calories}</Text>
              <Text style={styles.statPillLabel}>Cal</Text>
            </LinearGradient>
          </View>
          <View style={styles.statPill}>
            <LinearGradient colors={['rgba(76,175,80,0.12)', 'rgba(76,175,80,0.04)']} style={styles.statPillGrad}>
              <MaterialIcons name="terrain" size={16} color="#4CAF50" />
              <Text style={styles.statPillValue}>{Math.round(elevationGain)}m</Text>
              <Text style={styles.statPillLabel}>Elev.</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Splits (after workout) */}
        {!isTracking && splits.length > 0 && (
          <TouchableOpacity style={styles.splitsToggle} onPress={() => setShowSplits(!showSplits)} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="format-list-numbered" size={18} color={S_COLORS.accentSecondary} />
              <Text style={styles.splitsToggleText}>Km Splits ({splits.length})</Text>
            </View>
            <MaterialIcons name={showSplits ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={22} color={S_COLORS.textDim} />
          </TouchableOpacity>
        )}
        {showSplits && splits.length > 0 && (
          <ScrollView style={styles.splitsList} nestedScrollEnabled>
            {splits.map((time, i) => (
              <View key={i} style={styles.splitRow}>
                <Text style={styles.splitKm}>Km {i + 1}</Text>
                <Text style={styles.splitTime}>{formatSplitTime(time)}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* AI Insight Section */}
        {!isTracking && distanceKm > 0 && (
          <View style={styles.aiSection}>
            {!aiInsight && !isAnalyzing && (
              <TouchableOpacity style={{ width: '100%' }} activeOpacity={0.85} onPress={generateGeminiInsight}>
                <LinearGradient colors={['#7C3AED', '#FF477E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiButton}>
                  <View style={styles.aiButtonIcon}><FontAwesome5 name="magic" size={14} color="#FFF" /></View>
                  <Text style={styles.aiButtonText}>AI Coach Analysis</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>
            )}
            {isAnalyzing && (
              <View style={styles.aiLoader}>
                <ActivityIndicator color={S_COLORS.accentSecondary} />
                <Text style={styles.aiLoaderText}>Gemini is analyzing your {ACTIVITY_CONFIG[activityType].label.toLowerCase()}...</Text>
              </View>
            )}
            {aiInsight && (
              <View style={styles.aiInsightBox}>
                <View style={styles.aiHeader}>
                  <View style={styles.aiHeaderIcon}><FontAwesome5 name="robot" size={14} color={S_COLORS.accentSecondary} /></View>
                  <Text style={styles.aiTitle}>Coach Insight</Text>
                </View>
                <Text style={styles.aiInsightText}>{aiInsight}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        {isTracking ? (
          <View style={styles.trackingActions}>
            <TouchableOpacity style={styles.secondaryActionBtn} activeOpacity={0.85} onPress={isPaused ? resumeTracking : pauseTracking}>
              <View style={[styles.secondaryActionInner, { backgroundColor: isPaused ? 'rgba(0,136,255,0.12)' : 'rgba(255,138,0,0.12)' }]}>
                <MaterialIcons name={isPaused ? "play-arrow" : "pause"} size={26} color={isPaused ? '#0088FF' : '#FF8A00'} />
              </View>
              <Text style={styles.secondaryActionLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.stopActionBtn} activeOpacity={0.85} onPress={stopTracking}>
              <LinearGradient colors={['#FF477E', '#FF512F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stopActionGrad}>
                <MaterialIcons name="stop" size={28} color="#FFF" />
              </LinearGradient>
              <Text style={styles.secondaryActionLabel}>Finish</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionBtn} activeOpacity={0.85} onPress={centerOnMe}>
              <View style={[styles.secondaryActionInner, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
                <MaterialIcons name="my-location" size={22} color={S_COLORS.accentSecondary} />
              </View>
              <Text style={styles.secondaryActionLabel}>Center</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionShadow} activeOpacity={0.85} onPress={startTracking}>
            <LinearGradient
              colors={['#7C3AED', '#FF477E'] as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.actionButton}
            >
              <ActivityIcon type={activityType} size={22} color="#FFF" />
              <Text style={styles.actionButtonText}>
                {distanceKm > 0 ? `New ${ACTIVITY_CONFIG[activityType].label}` : `Start ${ACTIVITY_CONFIG[activityType].label}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: S_COLORS.bg },

  topHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: S_COLORS.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },

  trackingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: S_COLORS.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5 },
  trackingPaused: { borderWidth: 1.5, borderColor: '#FF8A00' },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: S_COLORS.accent, marginRight: 8 },
  trackingText: { fontFamily: 'Poppins_700Bold', fontSize: 13, color: S_COLORS.text, letterSpacing: 1 },

  // Activity selector
  activitySelector: { position: 'absolute', top: Platform.OS === 'ios' ? 118 : 98, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 10, zIndex: 10 },
  activityChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: S_COLORS.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  activityChipActive: { backgroundColor: S_COLORS.accentSecondary },
  activityChipText: { fontFamily: 'Quicksand_600SemiBold', fontSize: 14, color: S_COLORS.textDim },
  activityChipTextActive: { color: '#FFF' },

  // Center button
  centerButton: { position: 'absolute', right: 24, bottom: 380, width: 48, height: 48, borderRadius: 24, backgroundColor: S_COLORS.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, zIndex: 10 },

  // Live pace badge
  livePaceBadge: { position: 'absolute', left: 24, bottom: 380, zIndex: 10 },
  livePaceGradient: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  livePaceText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: '#FFF' },

  // Markers
  markerStart: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
  markerEnd: { width: 28, height: 28, borderRadius: 14, backgroundColor: S_COLORS.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: S_COLORS.card,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 20, paddingHorizontal: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.10, shadowRadius: 24, elevation: 24,
  },
  handleBar: { width: 40, height: 5, backgroundColor: S_COLORS.border, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },

  distanceHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, gap: 20 },
  distanceNumber: { fontFamily: 'Poppins_700Bold', fontSize: 52, color: S_COLORS.text, letterSpacing: -2, lineHeight: 56 },
  distanceUnitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  distanceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: S_COLORS.accent, marginRight: 4 },
  distanceUnit: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: S_COLORS.textDim, textTransform: 'uppercase', letterSpacing: 2 },

  liveTimerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: S_COLORS.bg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  liveTimerText: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: '#0088FF', fontVariant: ['tabular-nums'] },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statPill: { flex: 1 },
  statPillGrad: { alignItems: 'center', paddingVertical: 12, borderRadius: 18, gap: 2 },
  statPillValue: { fontFamily: 'Poppins_700Bold', fontSize: 15, color: S_COLORS.text, marginTop: 4 },
  statPillLabel: { fontFamily: 'Quicksand_500Medium', fontSize: 10, color: S_COLORS.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Splits
  splitsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: S_COLORS.bg, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, marginBottom: 10 },
  splitsToggleText: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: S_COLORS.text },
  splitsList: { maxHeight: 120, backgroundColor: S_COLORS.bg, borderRadius: 16, paddingHorizontal: 16, marginBottom: 10 },
  splitRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: S_COLORS.border },
  splitKm: { fontFamily: 'Quicksand_600SemiBold', fontSize: 14, color: S_COLORS.text },
  splitTime: { fontFamily: 'Poppins_700Bold', fontSize: 14, color: S_COLORS.accentSecondary },

  // AI
  aiSection: { marginBottom: 14 },
  aiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 20, gap: 10 },
  aiButtonIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  aiButtonText: { fontFamily: 'Poppins_700Bold', color: '#FFF', fontSize: 14, flex: 1 },
  aiLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 10, backgroundColor: S_COLORS.bg, borderRadius: 20 },
  aiLoaderText: { fontFamily: 'Quicksand_500Medium', color: S_COLORS.textDim, fontSize: 13 },
  aiInsightBox: { backgroundColor: S_COLORS.bg, padding: 18, borderRadius: 20, borderWidth: 1, borderColor: S_COLORS.border },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiHeaderIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(124,58,237,0.1)', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontFamily: 'Poppins_700Bold', color: S_COLORS.text, fontSize: 15 },
  aiInsightText: { fontFamily: 'Quicksand_500Medium', color: S_COLORS.text, fontSize: 13, lineHeight: 20 },

  // Tracking action buttons (pause/stop/center)
  trackingActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  secondaryActionBtn: { alignItems: 'center', gap: 6 },
  secondaryActionInner: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  secondaryActionLabel: { fontFamily: 'Quicksand_600SemiBold', fontSize: 12, color: S_COLORS.textDim },
  stopActionBtn: { alignItems: 'center', gap: 6 },
  stopActionGrad: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },

  // Start button
  actionShadow: { shadowColor: S_COLORS.accentSecondary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
  actionButton: { width: '100%', paddingVertical: 18, borderRadius: 100, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  actionButtonText: { fontFamily: 'Poppins_700Bold', color: '#FFFFFF', fontSize: 16, letterSpacing: 0.5 },
});
