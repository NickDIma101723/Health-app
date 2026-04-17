import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { CaretLeft, PersonSimpleRun, PersonSimpleWalk, Bicycle, Timer, Flame, Gauge, Crosshair, Play, Pause, Stop, Sparkle, ListNumbers, CaretUp, CaretDown, ArrowRight, Heart, TrendUp, MapPin, NavigationArrow } from 'phosphor-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyzeWorkoutWithGemini } from '../lib/gemini';
import { MAPBOX_TOKEN } from '../lib/mapStyle';

const { width, height } = Dimensions.get('window');

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

const S_COLORS = {
  bg: '#FAFAFA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textDim: '#8C8C8C',
  border: '#EEEEEE',
  dark: '#111111',
  lime: '#D4F940',
  green: '#10B981',
};

type ActivityType = 'run' | 'walk' | 'cycle';

const ACTIVITY_CONFIG: Record<ActivityType, { label: string; caloriesPerKm: number }> = {
  run: { label: 'Run', caloriesPerKm: 65 },
  walk: { label: 'Walk', caloriesPerKm: 45 },
  cycle: { label: 'Cycle', caloriesPerKm: 30 },
};

const ACTIVITY_ICONS: Record<ActivityType, React.ComponentType<any>> = {
  run: PersonSimpleRun,
  walk: PersonSimpleWalk,
  cycle: Bicycle,
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildMapHtml(token: string, lat: number, lon: number) {
  const isDark = false;
  const dotBg = isDark ? '#111' : '#FFF';
  const dotBorder = '#D4F940';
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
body{margin:0;padding:0}
#map{position:absolute;top:0;bottom:0;width:100%;background:#FAFAFA;}
.user-dot{width:16px;height:16px;border-radius:50%;background:${dotBg};border:3px solid ${dotBorder};box-shadow:0 0 8px rgba(212,249,64,0.4);margin-left:-8px;margin-top:-8px;}
.user-dot.tracking{animation:pulse 1.5s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(212,249,64,0.35)}70%{box-shadow:0 0 0 12px rgba(212,249,64,0)}100%{box-shadow:0 0 0 0 rgba(212,249,64,0)}}
.start-marker{width:24px;height:24px;border-radius:50%;background:#D4F940;border:3px solid #111;display:flex;align-items:center;justify-content:center;font-size:12px;color:#111;font-weight:bold;margin-left:-12px;margin-top:-12px;}
.end-marker{width:24px;height:24px;border-radius:50%;background:#111;border:3px solid #FFF;display:flex;align-items:center;justify-content:center;margin-left:-12px;margin-top:-12px;}
.end-marker svg{width:12px;height:12px;fill:#FFF}
</style>
</head><body>
<div id="map"></div>
<script>
const map=L.map('map',{zoomControl:false}).setView([${lat},${lon}],15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
  attribution:'&copy; <a href="https://osm.org/copyright">OSM</a>'
}).addTo(map);

let userMarker=null,startMarker=null,endMarker=null,isTracking=false;
let routeGlow=L.polyline([],{color:'#D4F940',weight:12,opacity:0.15}).addTo(map);
let routeLine=L.polyline([],{color:'#D4F940',weight:4,opacity:0.9}).addTo(map);

const createDivIcon = (className, html='') => L.divIcon({className, html, iconSize:null});
userMarker=L.marker([${lat},${lon}],{icon:createDivIcon('user-dot')}).addTo(map);

window.addEventListener('message',(e)=>{
  const d=e.data;
  if(!d||!d.type)return;
  
  if(d.type==='updateLocation'){
    userMarker.setLatLng([d.lat,d.lon]);
    if(d.follow)map.setView([d.lat,d.lon],17,{animate:true});
  }
  
  if(d.type==='updateRoute'){
    const latlngs = d.coords.map(c=>[c[1],c[0]]);
    routeGlow.setLatLngs(latlngs);
    routeLine.setLatLngs(latlngs);
  }
  
  if(d.type==='setTracking'){
    isTracking=d.value;
    const el=userMarker.getElement();
    if(el){if(isTracking)el.classList.add('tracking');else el.classList.remove('tracking');}
  }
  
  if(d.type==='addStartMarker'){
    if(startMarker)map.removeLayer(startMarker);
    startMarker=L.marker([d.lat,d.lon],{icon:createDivIcon('start-marker','▶')}).addTo(map);
  }
  
  if(d.type==='addEndMarker'){
    if(endMarker)map.removeLayer(endMarker);
    const svg='<svg viewBox="0 0 24 24"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/></svg>';
    endMarker=L.marker([d.lat,d.lon],{icon:createDivIcon('end-marker',svg)}).addTo(map);
  }
  
  if(d.type==='fitBounds'){
    map.fitBounds([[d.sw[1],d.sw[0]],[d.ne[1],d.ne[0]]],{padding:[60,60],animate:true});
  }
  
  if(d.type==='centerOn'){
    map.setView([d.lat,d.lon],17,{animate:true});
  }
});
</script>
</body></html>`;
}

export const ActivityMapScreen = ({ onNavigate }: { onNavigate: (screen: string) => void }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>('run');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [calories, setCalories] = useState(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [splits, setSplits] = useState<number[]>([]);
  const [lastSplitKm, setLastSplitKm] = useState(0);
  const [lastSplitTime, setLastSplitTime] = useState(0);
  const [subscription, setSubscription] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSplits, setShowSplits] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const postToMap = useCallback((msg: any) => {
    iframeRef.current?.contentWindow?.postMessage(msg, '*');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let initialLoc = await Location.getCurrentPositionAsync({});
        setCurrentLocation({ latitude: initialLoc.coords.latitude, longitude: initialLoc.coords.longitude });
      } catch (e) {}
    })();
    return () => { if (subscription !== null) navigator.geolocation.clearWatch(subscription); };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking && !isPaused) {
      interval = setInterval(() => setDurationSec(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTracking, isPaused]);

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

  const handleLocationUpdate = useCallback((lat: number, lon: number, speed: number | null) => {
    const newCoord = { latitude: lat, longitude: lon };
    if (speed !== null && speed >= 0) setCurrentSpeedKmh(speed * 3.6);

    postToMap({ type: 'updateLocation', lat, lon, follow: isFollowing });

    setCurrentLocation(prev => {
      if (prev) {
        const dist = getDistanceFromLatLonInKm(prev.latitude, prev.longitude, lat, lon);
        if (dist > 0.001) {
          setDistanceKm(d => { const nd = d + dist; setCalories(Math.floor(nd * ACTIVITY_CONFIG[activityType].caloriesPerKm)); return nd; });
          setRouteCoordinates(coords => {
            const updated = [...coords, [lon, lat] as [number, number]];
            postToMap({ type: 'updateRoute', coords: updated });
            return updated;
          });
        }
      }
      return newCoord;
    });
  }, [isFollowing, activityType, postToMap]);

  const startTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { alert('Location permission is required to track your workout'); return; }

    setDistanceKm(0); setDurationSec(0); setCalories(0); setCurrentSpeedKmh(0);
    setSplits([]); setLastSplitKm(0); setLastSplitTime(0);
    setIsTracking(true); setIsPaused(false); setAiInsight(null); setShowSplits(false);
    setIsFollowing(true);

    const initCoords: [number, number][] = [];
    if (currentLocation) {
      initCoords.push([currentLocation.longitude, currentLocation.latitude]);
      postToMap({ type: 'addStartMarker', lat: currentLocation.latitude, lon: currentLocation.longitude });
    }
    setRouteCoordinates(initCoords);
    postToMap({ type: 'setTracking', value: true });
    postToMap({ type: 'updateRoute', coords: initCoords });

    const watchId = navigator.geolocation.watchPosition(
      (loc) => handleLocationUpdate(loc.coords.latitude, loc.coords.longitude, loc.coords.speed),
      (error) => console.log(error),
      { enableHighAccuracy: true, maximumAge: 1500 }
    );
    setSubscription(watchId);
  };

  const pauseTracking = () => {
    setIsPaused(true);
    if (subscription !== null) { navigator.geolocation.clearWatch(subscription); setSubscription(null); }
  };

  const resumeTracking = () => {
    setIsPaused(false);
    const watchId = navigator.geolocation.watchPosition(
      (loc) => handleLocationUpdate(loc.coords.latitude, loc.coords.longitude, loc.coords.speed),
      (error) => console.log(error),
      { enableHighAccuracy: true, maximumAge: 1500 }
    );
    setSubscription(watchId);
  };

  const stopTracking = () => {
    setIsTracking(false); setIsPaused(false);
    if (subscription !== null) { navigator.geolocation.clearWatch(subscription); setSubscription(null); }
    postToMap({ type: 'setTracking', value: false });

    // Save session
    if (distanceKm > 0.01) {
      const session = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        distanceKm: parseFloat(distanceKm.toFixed(3)),
        durationSec,
        calories,
        avgPace: calculatePace(),
        activityType,
        splits: splits.length > 0 ? splits : undefined,
      };
      AsyncStorage.getItem('run_sessions').then(raw => {
        const list = raw ? JSON.parse(raw) : [];
        list.unshift(session);
        AsyncStorage.setItem('run_sessions', JSON.stringify(list.slice(0, 100)));
      }).catch(() => {});
    }

    if (routeCoordinates.length >= 2) {
      const last = routeCoordinates[routeCoordinates.length - 1];
      postToMap({ type: 'addEndMarker', lat: last[1], lon: last[0] });

      const lngs = routeCoordinates.map(c => c[0]);
      const lats = routeCoordinates.map(c => c[1]);
      const pad = 0.002;
      postToMap({ type: 'fitBounds', sw: [Math.min(...lngs) - pad, Math.min(...lats) - pad], ne: [Math.max(...lngs) + pad, Math.max(...lats) + pad] });
      setIsFollowing(false);
    }
  };

  const centerOnMe = useCallback(() => {
    if (currentLocation) {
      setIsFollowing(true);
      postToMap({ type: 'centerOn', lat: currentLocation.latitude, lon: currentLocation.longitude });
    }
  }, [currentLocation, postToMap]);

  const generateGeminiInsight = async () => {
    setIsAnalyzing(true);
    const insight = await analyzeWorkoutWithGemini({ distance: distanceKm.toFixed(2), time: formatTime(durationSec), calories, pace: calculatePace() });
    setAiInsight(insight); setIsAnalyzing(false);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
    if (h > 0) return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatSplitTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}'${s < 10 ? '0' : ''}${s}"`; };

  const calculatePace = () => {
    if (distanceKm < 0.01 || durationSec < 10) return "0'00\"";
    const totalMinutes = durationSec / 60; const paceVal = totalMinutes / distanceKm;
    const paceM = Math.floor(paceVal); const paceS = Math.floor((paceVal - paceM) * 60);
    return `${paceM}'${paceS < 10 ? '0' : ''}${paceS}"`;
  };

  const initialLoc = useRef<{lat: number, lon: number} | null>(null);
  if (currentLocation && !initialLoc.current) {
      initialLoc.current = { lat: currentLocation.latitude, lon: currentLocation.longitude };
  }
  const lat = initialLoc.current?.lat || 37.79050;
  const lon = initialLoc.current?.lon || -122.4344;
  const mapHtml = React.useMemo(() => buildMapHtml(MAPBOX_TOKEN, lat, lon), [lat, lon]);

  const ActivityIcon = ({ type, size, color }: { type: ActivityType; size: number; color: string }) => {
    const Icon = ACTIVITY_ICONS[type];
    return <Icon size={size} color={color} weight="fill" />;
  };

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <iframe
          ref={iframeRef}
          width="100%" height="100%" frameBorder="0" scrolling="no"
          srcDoc={mapHtml}
          sandbox="allow-scripts allow-same-origin"
          style={{ border: 0 }}
          title="Activity Map"
        />
      </View>

      {/* Top header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('running')}>
          <CaretLeft size={22} color={S_COLORS.text} weight="bold" />
        </TouchableOpacity>
        {isTracking && (
          <View style={[styles.trackingIndicator, isPaused && styles.trackingPaused]}>
            <View style={[styles.trackingDot, isPaused && { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.trackingText, isPaused && { color: '#F59E0B' }]}>{isPaused ? 'Paused' : 'Recording'}</Text>
          </View>
        )}
      </View>

      {/* Center on me */}
      {isTracking && !isFollowing && (
        <TouchableOpacity style={styles.centerButton} onPress={centerOnMe} activeOpacity={0.85}>
          <Crosshair size={22} color={S_COLORS.text} weight="bold" />
        </TouchableOpacity>
      )}

      {/* Live pace badge */}
      {isTracking && !isPaused && (
        <View style={styles.livePaceBadge}>
          <View style={styles.livePaceChip}>
            <Gauge size={14} color="#10B981" weight="fill" />
            <Text style={styles.livePaceText}>{currentSpeedKmh.toFixed(1)}</Text>
            <Text style={styles.livePaceUnit}>km/h</Text>
          </View>
        </View>
      )}

      {/* ── Bottom Sheet (compact by default, expand on tap) ── */}
      <View style={[styles.bottomSheet, sheetExpanded && styles.bottomSheetExpanded]}>
        {/* Pull handle — tap to toggle */}
        <TouchableOpacity style={styles.handleArea} onPress={() => setSheetExpanded(!sheetExpanded)} activeOpacity={0.9}>
          <View style={styles.handleBar} />
        </TouchableOpacity>

        {/* ─── COMPACT VIEW (always visible) ─── */}
        <View style={styles.compactRow}>
          {/* Distance */}
          <View style={styles.compactMain}>
            <Text style={styles.compactDistance}>{distanceKm.toFixed(2)}</Text>
            <Text style={styles.compactDistUnit}>km</Text>
          </View>
          {/* 3 inline stats */}
          <View style={styles.compactStats}>
            <View style={styles.compactStat}>
              <Timer size={13} color="#8C8C8C" weight="bold" />
              <Text style={styles.compactStatVal}>{formatTime(durationSec)}</Text>
            </View>
            <View style={styles.compactDivider} />
            <View style={styles.compactStat}>
              <Gauge size={13} color="#8C8C8C" weight="bold" />
              <Text style={styles.compactStatVal}>{calculatePace()}</Text>
            </View>
            <View style={styles.compactDivider} />
            <View style={styles.compactStat}>
              <Flame size={13} color="#8C8C8C" weight="bold" />
              <Text style={styles.compactStatVal}>{calories}</Text>
            </View>
          </View>
        </View>

        {/* Action buttons — always visible */}
        {isTracking ? (
          <View style={styles.trackingActions}>
            <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85} onPress={isPaused ? resumeTracking : pauseTracking}>
              <View style={styles.ctrlBtnSide}>
                {isPaused ? <Play size={20} color="#111" weight="fill" /> : <Pause size={20} color="#111" weight="fill" />}
              </View>
              <Text style={styles.ctrlLabel}>{isPaused ? 'Resume' : 'Pause'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85} onPress={stopTracking}>
              <View style={styles.stopCircle}>
                <Stop size={18} color="#FFF" weight="fill" />
              </View>
              <Text style={styles.ctrlLabel}>Finish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} activeOpacity={0.85} onPress={centerOnMe}>
              <View style={styles.ctrlBtnSide}>
                <NavigationArrow size={18} color="#111" weight="fill" />
              </View>
              <Text style={styles.ctrlLabel}>Center</Text>
            </TouchableOpacity>
          </View>
        ) : distanceKm === 0 ? (
          <View style={styles.preStartArea}>
            <View style={styles.activityPickerRow}>
              {(Object.keys(ACTIVITY_CONFIG) as ActivityType[]).map(type => {
                const Icon = ACTIVITY_ICONS[type];
                const active = activityType === type;
                return (
                  <TouchableOpacity key={type} style={[styles.activityPick, active && styles.activityPickActive]} onPress={() => setActivityType(type)} activeOpacity={0.8}>
                    <Icon size={16} color={active ? '#FFF' : '#999'} weight={active ? 'fill' : 'regular'} />
                    <Text style={[styles.activityPickText, active && styles.activityPickTextActive]}>{ACTIVITY_CONFIG[type].label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity activeOpacity={0.85} onPress={startTracking}>
              <View style={styles.startButton}>
                <Text style={styles.startButtonText}>Start {ACTIVITY_CONFIG[activityType].label}</Text>
                <View style={styles.startButtonIcon}><Play size={14} color="#111" weight="fill" /></View>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity activeOpacity={0.85} onPress={startTracking}>
            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>New {ACTIVITY_CONFIG[activityType].label}</Text>
              <View style={styles.startButtonIcon}><Play size={14} color="#111" weight="fill" /></View>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── EXPANDED VIEW (swipe up for more detail) ─── */}
        {sheetExpanded && (
          <ScrollView style={styles.expandedScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.expandSep} />

            {/* Detail stats 2x2 */}
            <View style={styles.detailGrid}>
              <View style={[styles.detailCard, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEEEEE' }]}>
                <View style={styles.detailCardTop}>
                  <Timer size={14} color="#8C8C8C" weight="bold" />
                  <Text style={styles.detailLabel}>Duration</Text>
                </View>
                <Text style={styles.detailValue}>{formatTime(durationSec)}</Text>
              </View>
              <View style={[styles.detailCard, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEEEEE' }]}>
                <View style={styles.detailCardTop}>
                  <Gauge size={14} color="#8C8C8C" weight="bold" />
                  <Text style={styles.detailLabel}>Avg Pace</Text>
                </View>
                <Text style={styles.detailValue}>{calculatePace()}<Text style={styles.detailSm}>/km</Text></Text>
              </View>
              <View style={[styles.detailCard, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEEEEE' }]}>
                <View style={styles.detailCardTop}>
                  <Flame size={14} color="#8C8C8C" weight="bold" />
                  <Text style={styles.detailLabel}>Calories</Text>
                </View>
                <Text style={styles.detailValue}>{calories}<Text style={styles.detailSm}> kcal</Text></Text>
              </View>
              <View style={[styles.detailCard, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEEEEE' }]}>
                <View style={styles.detailCardTop}>
                  <TrendUp size={14} color="#8C8C8C" weight="bold" />
                  <Text style={styles.detailLabel}>Speed</Text>
                </View>
                <Text style={styles.detailValue}>{currentSpeedKmh.toFixed(1)}<Text style={styles.detailSm}> km/h</Text></Text>
              </View>
            </View>

            {/* Goal ring row */}
            <View style={styles.goalRow}>
              <Svg width={44} height={44}>
                <SvgCircle cx={22} cy={22} r={18} stroke="#F0F0F0" strokeWidth={3.5} fill="none" />
                <SvgCircle cx={22} cy={22} r={18} stroke="#111" strokeWidth={3.5} fill="none"
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - Math.min(distanceKm / 5, 1))}`}
                  strokeLinecap="round" rotation="-90" origin="22,22"
                />
              </Svg>
              <View style={{ flex: 1 }}>
                <Text style={styles.goalTitle}>{Math.min(Math.round((distanceKm / 5) * 100), 100)}% of 5K goal</Text>
                <Text style={styles.goalSub}>{Math.max(0, (5 - distanceKm)).toFixed(2)} km remaining</Text>
              </View>
            </View>

            {/* Pace trend */}
            {(splits.length > 0 || distanceKm > 0) && (
              <View style={styles.paceBar}>
                <View style={styles.paceBarHead}>
                  <TrendUp size={13} color="#999" />
                  <Text style={styles.paceBarLabel}>Pace Trend</Text>
                </View>
                <View style={styles.paceBarTrack}>
                  {splits.length > 0 ? splits.slice(-8).map((s, i) => {
                    const maxS = Math.max(...splits.slice(-8));
                    const h = Math.max(6, (s / maxS) * 24);
                    return <View key={i} style={[styles.paceBarSeg, { height: h, backgroundColor: i === splits.slice(-8).length - 1 ? '#111' : '#D4D4D4' }]} />;
                  }) : [0.6, 0.8, 0.5, 0.9, 0.7, 0.4].map((v, i) => (
                    <View key={i} style={[styles.paceBarSeg, { height: v * 24, backgroundColor: '#EEE' }]} />
                  ))}
                </View>
              </View>
            )}

            {/* Splits */}
            {!isTracking && splits.length > 0 && (
              <>
                <TouchableOpacity style={styles.splitsToggle} onPress={() => setShowSplits(!showSplits)} activeOpacity={0.7}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ListNumbers size={15} color="#111" weight="bold" />
                    <Text style={styles.splitsToggleText}>Splits</Text>
                    <View style={styles.splitsCount}><Text style={styles.splitsCountText}>{splits.length}</Text></View>
                  </View>
                  {showSplits ? <CaretUp size={16} color="#999" /> : <CaretDown size={16} color="#999" />}
                </TouchableOpacity>
                {showSplits && (
                  <View style={styles.splitsList}>
                    {splits.map((time, i) => (
                      <View key={i} style={[styles.splitRow, i === splits.length - 1 && { borderBottomWidth: 0 }]}>
                        <View style={styles.splitLeft}>
                          <View style={[styles.splitDot, i === 0 && { backgroundColor: '#10B981' }, i === splits.length - 1 && { backgroundColor: '#EF4444' }]} />
                          <Text style={styles.splitKm}>Km {i + 1}</Text>
                        </View>
                        <Text style={styles.splitTime}>{formatSplitTime(time)}</Text>
                        {i > 0 && (
                          <Text style={[styles.splitDiff, time < splits[i - 1] ? { color: '#10B981' } : { color: '#EF4444' }]}>
                            {time < splits[i - 1] ? '↓' : '↑'}{Math.abs(time - splits[i - 1])}s
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* AI */}
            {!isTracking && distanceKm > 0 && (
              <View style={styles.aiSection}>
                {!aiInsight && !isAnalyzing && (
                  <TouchableOpacity style={styles.aiButton} activeOpacity={0.85} onPress={generateGeminiInsight}>
                    <View style={styles.aiGrad}>
                      <Sparkle size={14} color="#FFF" weight="fill" />
                      <Text style={styles.aiGradText}>Get AI Coaching</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {isAnalyzing && (
                  <View style={styles.aiLoader}>
                    <ActivityIndicator color="#111" />
                    <Text style={styles.aiLoaderText}>Analyzing...</Text>
                  </View>
                )}
                {aiInsight && (
                  <View style={styles.aiInsightBox}>
                    <View style={styles.aiHeader}>
                      <View style={styles.aiHeaderIcon}><Sparkle size={12} color="#111" weight="fill" /></View>
                      <Text style={styles.aiTitle}>AI Coach</Text>
                    </View>
                    <Text style={styles.aiInsightText}>{aiInsight}</Text>
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A24' },
  topHeader: { position: 'absolute', top: 56, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
  backButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: S_COLORS.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },

  trackingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  trackingPaused: { backgroundColor: '#1A1A1A' },
  trackingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4F940', marginRight: 7 },
  trackingText: { fontFamily: F.semi, fontSize: 12, color: '#FFF', letterSpacing: 0.3 },

  centerButton: { position: 'absolute', right: 24, bottom: 220, width: 48, height: 48, borderRadius: 24, backgroundColor: S_COLORS.card, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, zIndex: 10 },

  livePaceBadge: { position: 'absolute', left: 24, bottom: 220, zIndex: 10 },
  livePaceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEEEEE', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  livePaceText: { fontFamily: F.bold, fontSize: 15, color: '#111' },
  livePaceUnit: { fontFamily: F.medium, fontSize: 11, color: '#999', marginLeft: -2 },

  /* ── Bottom Sheet ── */
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FAFAFA', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 28, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 12,
    maxHeight: 210,
  },
  bottomSheetExpanded: {
    maxHeight: height * 0.65,
  },
  handleArea: { paddingTop: 10, paddingBottom: 8, alignItems: 'center' },
  handleBar: { width: 32, height: 4, backgroundColor: '#D4D4D4', borderRadius: 2 },

  /* Compact row — always visible */
  compactRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  compactMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  compactDistance: { fontFamily: F.bold, fontSize: 38, color: '#111', letterSpacing: -1.5, lineHeight: 42 },
  compactDistUnit: { fontFamily: F.medium, fontSize: 15, color: '#999' },
  compactStats: { flexDirection: 'row', alignItems: 'center', gap: 0, backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  compactStat: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  compactStatVal: { fontFamily: F.semi, fontSize: 13, color: '#1A1A1A' },
  compactDivider: { width: 1, height: 14, backgroundColor: '#EBEBEB' },

  /* Tracking controls */
  trackingActions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 24 },
  ctrlBtn: { alignItems: 'center', gap: 5 },
  ctrlBtnSide: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  ctrlLabel: { fontFamily: F.medium, fontSize: 11, color: '#999' },
  stopCircle: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },

  /* Pre-start */
  preStartArea: { gap: 10 },
  activityPickerRow: { flexDirection: 'row', gap: 6 },
  activityPick: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F0F0F0' },
  activityPickActive: { backgroundColor: '#111' },
  activityPickText: { fontFamily: F.semi, fontSize: 13, color: '#999' },
  activityPickTextActive: { color: '#FFF' },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', paddingVertical: 16, borderRadius: 100, gap: 8 },
  startButtonText: { fontFamily: F.bold, color: '#FFF', fontSize: 16 },
  startButtonIcon: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#D4F940', alignItems: 'center', justifyContent: 'center' },

  /* ── Expanded section ── */
  expandedScroll: { marginTop: 4 },
  expandSep: { height: 1, backgroundColor: '#EBEBEB', marginBottom: 14 },

  /* Detail grid 2x2 */
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  detailCard: { width: (width - 32 - 8) / 2, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14 },
  detailCardTop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  detailLabel: { fontFamily: F.medium, fontSize: 11, color: '#888' },
  detailValue: { fontFamily: F.bold, fontSize: 20, color: '#111', letterSpacing: -0.5 },
  detailSm: { fontFamily: F.regular, fontSize: 12, color: '#999' },

  /* Goal ring */
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEEEEE' },
  goalTitle: { fontFamily: F.semi, fontSize: 14, color: '#111' },
  goalSub: { fontFamily: F.regular, fontSize: 12, color: '#999', marginTop: 1 },

  /* Pace bar */
  paceBar: { backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEEEEE' },
  paceBarHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  paceBarLabel: { fontFamily: F.medium, fontSize: 11, color: '#999' },
  paceBarTrack: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 26 },
  paceBarSeg: { flex: 1, borderRadius: 3, minHeight: 4 },

  /* Splits */
  splitsToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EEEEEE' },
  splitsToggleText: { fontFamily: F.semi, fontSize: 13, color: '#111' },
  splitsCount: { backgroundColor: '#111', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  splitsCountText: { fontFamily: F.bold, fontSize: 9, color: '#FFF' },
  splitsList: { backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 2, marginBottom: 10, borderWidth: 1, borderColor: '#EEEEEE' },
  splitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  splitLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  splitDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D4D4D4' },
  splitKm: { fontFamily: F.semi, fontSize: 12, color: '#333' },
  splitTime: { fontFamily: F.bold, fontSize: 13, color: '#111', marginRight: 8 },
  splitDiff: { fontFamily: F.semi, fontSize: 10 },

  /* AI */
  aiSection: { marginBottom: 10 },
  aiButton: { overflow: 'hidden', borderRadius: 14, backgroundColor: '#111' },
  aiGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 7 },
  aiGradText: { fontFamily: F.semi, color: '#FFF', fontSize: 13 },
  aiLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#EEEEEE' },
  aiLoaderText: { fontFamily: F.medium, color: '#8C8C8C', fontSize: 12 },
  aiInsightBox: { backgroundColor: '#FFF', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#EEEEEE' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiHeaderIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontFamily: F.bold, color: '#111', fontSize: 13 },
  aiInsightText: { fontFamily: F.regular, color: '#555', fontSize: 12, lineHeight: 18 },
});
