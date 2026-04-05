import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import ReAnimated, { FadeInDown } from 'react-native-reanimated';
import {
  Play, Pause, Stop, MusicNote, SpeakerHigh, Waveform,
  CloudRain, Drop, Fire, Lightning, Wind, Waves,
  WaveSine, Bell, TreeEvergreen, Moon, Clock,
  Lightbulb, PlayCircle, X, Sparkle,
  Bird, Campfire, Coffee, Fan, Headphones, Heartbeat,
  Leaf, Mountains, Train, Note, FlowerLotus,
} from 'phosphor-react-native';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

// ── Design tokens (cool/dark — distinct from Mindfulness) ──
const MC = {
  bg:         '#FAFAFA',
  card:       '#FFFFFF',
  cardDark:   '#111111',
  text:       '#1A1A1A',
  textDim:    '#8C8C8C',
  border:     '#EEEEEE',
  surfaceMuted: '#F3F3F3',
  accent:     '#3B82F6',
  accentSoft: 'rgba(59, 130, 246, 0.10)',
  warmBg:     '#F5F0EB',
  sky:        '#38BDF8',
  warm:       '#F59E0B',
  lime:       '#D4F940',
};

const MF = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

// ── Sound library ──────────────────────────────────────────
const SOUND_FILES: Record<string, any> = {
  rain:             require('../../assets/sounds/rain.mp3'),
  'rainfall-heavy': require('../../assets/sounds/rainfall-heavy.mp3'),
  'ocean-waves':    require('../../assets/sounds/ocean-waves.mp3'),
  campfire:         require('../../assets/sounds/campfire.mp3'),
  crickets:         require('../../assets/sounds/crickets.mp3'),
  stream:           require('../../assets/sounds/stream.mp3'),
  thunder:          require('../../assets/sounds/thunder.mp3'),
  wind:             require('../../assets/sounds/wind.mp3'),
  birds:            require('../../assets/sounds/birds.mp3'),
  forest:           require('../../assets/sounds/forest.mp3'),
  waterfall:        require('../../assets/sounds/waterfall.mp3'),
  'night-frogs':    require('../../assets/sounds/night-frogs.mp3'),
  'white-noise':    require('../../assets/sounds/white-noise.mp3'),
  'pink-noise':     require('../../assets/sounds/pink-noise.mp3'),
  'brown-noise':    require('../../assets/sounds/brown-noise.mp3'),
  fan:              require('../../assets/sounds/fan.mp3'),
  'deep-drone':     require('../../assets/sounds/deep-drone.mp3'),
  'singing-bowl':   require('../../assets/sounds/singing-bowl.mp3'),
  chimes:           require('../../assets/sounds/chimes.mp3'),
  heartbeat:        require('../../assets/sounds/heartbeat.mp3'),
  'piano-ambient':  require('../../assets/sounds/piano-ambient.mp3'),
  cafe:             require('../../assets/sounds/cafe.mp3'),
  'train-ride':     require('../../assets/sounds/train-ride.mp3'),
};

type SoundEntry = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  bg: string;
  tint: string;
  category: 'nature' | 'noise' | 'ambient';
};

// ── Sounds (use bg/tint like breathingExercises) ──────────
const NATURE_SOUNDS: SoundEntry[] = [
  { id: 'rain',            label: 'Gentle Rain',      description: 'Soft rainfall on leaves',          icon: CloudRain,     bg: '#EFF6FF', tint: '#3B82F6', category: 'nature' },
  { id: 'rainfall-heavy',  label: 'Heavy Rain',       description: 'Intense downpour on a rooftop',    icon: CloudRain,     bg: '#DBEAFE', tint: '#2563EB', category: 'nature' },
  { id: 'ocean-waves',     label: 'Ocean Waves',      description: 'Calm waves rolling on shore',      icon: Waves,         bg: '#F0F9FF', tint: '#0EA5E9', category: 'nature' },
  { id: 'thunder',         label: 'Thunderstorm',     description: 'Distant rumbling thunder',          icon: Lightning,     bg: '#FAF5FF', tint: '#A855F7', category: 'nature' },
  { id: 'stream',          label: 'Forest Stream',    description: 'Babbling brook in the woods',       icon: Drop,          bg: '#F0FDFA', tint: '#14B8A6', category: 'nature' },
  { id: 'waterfall',       label: 'Waterfall',        description: 'Rushing cascade into a pool',       icon: Mountains,     bg: '#F0FDFA', tint: '#0D9488', category: 'nature' },
  { id: 'wind',            label: 'Wind',             description: 'Soft breeze through the trees',     icon: Wind,          bg: '#F8FAFC', tint: '#64748B', category: 'nature' },
  { id: 'birds',           label: 'Birdsong',         description: 'Morning chorus of songbirds',       icon: Bird,          bg: '#F0FDF4', tint: '#22C55E', category: 'nature' },
  { id: 'forest',          label: 'Deep Forest',      description: 'Rustling leaves and wildlife',      icon: TreeEvergreen, bg: '#F0FDF4', tint: '#16A34A', category: 'nature' },
  { id: 'night-frogs',     label: 'Night Frogs',      description: 'Chorus of frogs on a warm night',   icon: Moon,          bg: '#F5F3FF', tint: '#8B5CF6', category: 'nature' },
  { id: 'crickets',        label: 'Summer Night',     description: 'Crickets in the meadow',            icon: FlowerLotus,   bg: '#F7FEE7', tint: '#84CC16', category: 'nature' },
  { id: 'campfire',        label: 'Campfire',         description: 'Crackling wood on a quiet night',   icon: Campfire,      bg: '#FFF7ED', tint: '#F97316', category: 'nature' },
];

const NOISE_SOUNDS: SoundEntry[] = [
  { id: 'white-noise',     label: 'White Noise',      description: 'Full-spectrum static',              icon: WaveSine,      bg: '#EEF2FF', tint: '#6366F1', category: 'noise' },
  { id: 'pink-noise',      label: 'Pink Noise',       description: 'Balanced, deeper static',           icon: WaveSine,      bg: '#FDF2F8', tint: '#EC4899', category: 'noise' },
  { id: 'brown-noise',     label: 'Brown Noise',      description: 'Deep, rumbling warmth',             icon: WaveSine,      bg: '#FFFBEB', tint: '#92400E', category: 'noise' },
  { id: 'fan',             label: 'Fan',              description: 'Steady electric fan whir',          icon: Fan,           bg: '#F8FAFC', tint: '#475569', category: 'noise' },
];

const AMBIENT_SOUNDS: SoundEntry[] = [
  { id: 'deep-drone',      label: 'Deep Drone',       description: 'Low-frequency ambient hum',         icon: Waveform,      bg: '#F5F3FF', tint: '#7C3AED', category: 'ambient' },
  { id: 'singing-bowl',    label: 'Singing Bowl',     description: 'Tibetan resonance tones',           icon: Bell,          bg: '#FFFBEB', tint: '#D97706', category: 'ambient' },
  { id: 'chimes',          label: 'Wind Chimes',      description: 'Gentle metallic tinkling',          icon: Sparkle,       bg: '#FFFBEB', tint: '#F59E0B', category: 'ambient' },
  { id: 'heartbeat',       label: 'Heartbeat',        description: 'Steady, calming pulse',             icon: Heartbeat,     bg: '#FEF2F2', tint: '#EF4444', category: 'ambient' },
  { id: 'piano-ambient',   label: 'Ambient Piano',    description: 'Soft, dreamy piano melodies',       icon: Note,          bg: '#111111', tint: '#FFFFFF', category: 'ambient' },
  { id: 'cafe',            label: 'Coffee Shop',      description: 'Busy café with soft chatter',       icon: Coffee,        bg: '#F5F0EB', tint: '#78350F', category: 'ambient' },
  { id: 'train-ride',      label: 'Train Journey',    description: 'Rhythmic rails through countryside', icon: Train,        bg: '#E0F2FE', tint: '#0369A1', category: 'ambient' },
];

type MixEntry = {
  id: string;
  label: string;
  description: string;
  soundIds: string[];
  bg: string;
  tint: string;
  icon: React.ComponentType<any>;
};

const FEATURED_MIXES: MixEntry[] = [
  { id: 'rainy-cabin',    label: 'Rainy Cabin',       description: 'Rain + Campfire + Thunder',    soundIds: ['rain', 'campfire', 'thunder'],          bg: '#EFF6FF',  tint: '#3B82F6', icon: CloudRain },
  { id: 'deep-focus',     label: 'Deep Focus',        description: 'Brown Noise + Café + Piano',   soundIds: ['brown-noise', 'cafe', 'piano-ambient'], bg: '#F5F3FF',  tint: '#7C3AED', icon: Headphones },
  { id: 'tropical-night', label: 'Tropical Night',    description: 'Ocean + Frogs + Wind',         soundIds: ['ocean-waves', 'night-frogs', 'wind'],   bg: '#ECFDF5',  tint: '#059669', icon: Moon },
  { id: 'morning-peace',  label: 'Morning Peace',     description: 'Birds + Stream + Chimes',      soundIds: ['birds', 'stream', 'chimes'],            bg: '#FFFBEB',  tint: '#D97706', icon: Bird },
];

// ── Component ──────────────────────────────────────────────
export const MusicScreen: React.FC<{ onNavigate?: (screen: string) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'nature' | 'noise' | 'ambient'>('nature');
  const [activeSounds, setActiveSounds] = useState<Set<string>>(new Set());
  const soundRefs = useRef<Record<string, Audio.Sound>>({});

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    return () => {
      Object.values(soundRefs.current).forEach(s => s.unloadAsync());
    };
  }, []);

  // Tab switch animation (identical to Mindfulness)
  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: false }),
    ]).start();
  }, [activeTab]);

  const toggleSound = useCallback(async (id: string) => {
    if (activeSounds.has(id)) {
      const sound = soundRefs.current[id];
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        delete soundRefs.current[id];
      }
      setActiveSounds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      try {
        const { sound } = await Audio.Sound.createAsync(
          SOUND_FILES[id],
          { shouldPlay: true, isLooping: true, volume: 0.7 },
        );
        soundRefs.current[id] = sound;
        setActiveSounds(prev => new Set(prev).add(id));
      } catch (e) {
        console.error('Failed to play sound:', id, e);
      }
    }
  }, [activeSounds]);

  const stopAll = useCallback(async () => {
    await Promise.all(
      Object.values(soundRefs.current).map(s => s.stopAsync().then(() => s.unloadAsync())),
    );
    soundRefs.current = {};
    setActiveSounds(new Set());
  }, []);

  const playMix = useCallback(async (mix: MixEntry) => {
    await stopAll();
    for (const soundId of mix.soundIds) {
      try {
        const { sound } = await Audio.Sound.createAsync(
          SOUND_FILES[soundId],
          { shouldPlay: true, isLooping: true, volume: 0.6 },
        );
        soundRefs.current[soundId] = sound;
      } catch (e) {
        console.error('Failed to play mix sound:', soundId, e);
      }
    }
    setActiveSounds(new Set(mix.soundIds));
  }, [stopAll]);

  const activeCount = activeSounds.size;
  const allSounds = [...NATURE_SOUNDS, ...NOISE_SOUNDS, ...AMBIENT_SOUNDS];
  const activePlaying = allSounds.filter(s => activeSounds.has(s.id));

  const renderSoundCard = (entry: SoundEntry) => {
    const isActive = activeSounds.has(entry.id);
    const isDark = entry.bg === '#111111';
    const Icon = entry.icon;

    return (
      <TouchableOpacity
        key={entry.id}
        style={[S.breathCard, { backgroundColor: entry.bg }]}
        activeOpacity={0.85}
        onPress={() => toggleSound(entry.id)}
      >
        <View style={S.breathRow}>
          <View style={[S.breathIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : `${entry.tint}20` }]}>
            <Icon size={28} color={entry.tint} weight={isActive ? 'fill' : 'duotone'} />
          </View>
          <View style={S.breathInfo}>
            <Text style={[S.breathTitle, { color: entry.tint }]}>{entry.label}</Text>
            <Text style={[S.breathDesc, isDark && { color: 'rgba(255,255,255,0.5)' }]}>{entry.description}</Text>
            <View style={S.breathMeta}>
              <Clock size={13} color={isDark ? 'rgba(255,255,255,0.4)' : MC.textDim} />
              <Text style={[S.breathMetaText, isDark && { color: 'rgba(255,255,255,0.4)' }]}>Continuous loop</Text>
              {isActive && (
                <View style={[S.breathBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : `${entry.tint}18` }]}>
                  <Text style={[S.breathBadgeText, { color: entry.tint }]}>Playing</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[S.breathPlay, { backgroundColor: isActive ? '#EF4444' : (isDark ? MC.accent : entry.tint) }]}>
            {isActive
              ? <Stop size={22} color="#FFF" weight="fill" />
              : <Play size={22} color="#FFF" weight="fill" />
            }
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={S.container}>
      <ScrollView
        style={S.scrollView}
        contentContainerStyle={S.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        {/* Header */}
        <ReAnimated.View entering={FadeInDown.duration(600).springify()}>
          <View style={S.header}>
            <View>
              <Text style={S.headerSub}>Relax & Focus</Text>
              <Text style={S.headerTitle}>Music</Text>
            </View>
            <View style={S.headerBtn}>
              <SpeakerHigh size={20} color={activeCount > 0 ? MC.lime : '#FFFFFF'} weight={activeCount > 0 ? 'fill' : 'bold'} />
            </View>
          </View>
        </ReAnimated.View>

        {/* Stats Strip */}
        <ReAnimated.View entering={FadeInDown.delay(50).duration(600).springify()}>
          <View style={S.statsStrip}>
            <View style={S.statsStripItem}>
              <View style={[S.statsStripIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                <MusicNote size={16} color={MC.text} weight="fill" />
              </View>
              <Text style={S.statsStripNum}>{allSounds.length}</Text>
              <Text style={S.statsStripLabel}>Sounds</Text>
            </View>
            <View style={S.statsStripDivider} />
            <View style={S.statsStripItem}>
              <View style={[S.statsStripIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                <Waveform size={16} color={MC.text} weight="fill" />
              </View>
              <Text style={S.statsStripNum}>{activeCount}</Text>
              <Text style={S.statsStripLabel}>Playing</Text>
            </View>
            <View style={S.statsStripDivider} />
            <View style={S.statsStripItem}>
              <View style={[S.statsStripIcon, { backgroundColor: 'rgba(0,0,0,0.08)' }]}>
                <Sparkle size={16} color={MC.text} weight="fill" />
              </View>
              <Text style={S.statsStripNum}>{FEATURED_MIXES.length}</Text>
              <Text style={S.statsStripLabel}>Mixes</Text>
            </View>
          </View>
        </ReAnimated.View>

        {/* Now Playing (styled like moodCard) */}
        {activeCount > 0 && (
          <ReAnimated.View entering={FadeInDown.delay(80).duration(500).springify()}>
            <View style={S.nowPlayingCard}>
              <View style={S.nowPlayingHead}>
                <View style={S.nowPlayingIconBox}>
                  <Waveform size={20} color="#FFF" weight="bold" />
                </View>
                <Text style={S.nowPlayingTitle}>
                  {activeCount} sound{activeCount > 1 ? 's' : ''} playing
                </Text>
              </View>
              <Text style={S.nowPlayingDesc} numberOfLines={1}>
                {activePlaying.map(s => s.label).join(' · ')}
              </Text>
              <TouchableOpacity style={S.stopAllBtn} onPress={stopAll}>
                <Text style={S.stopAllBtnText}>Stop All</Text>
              </TouchableOpacity>
            </View>
          </ReAnimated.View>
        )}

        {/* Tabs */}
        <ReAnimated.View entering={FadeInDown.delay(150).duration(600).springify()}>
          <View style={S.tabBar}>
            {(['nature', 'noise', 'ambient'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[S.tab, activeTab === tab && S.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[S.tabText, activeTab === tab && S.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ReAnimated.View>

        {/* Nature Tab */}
        {activeTab === 'nature' && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={S.section}>
              <Text style={S.sectionTitle}>Nature Sounds</Text>
              <Text style={S.sectionSub}>Immerse yourself in the outdoors</Text>
              {NATURE_SOUNDS.map(renderSoundCard)}
            </View>

            <View style={S.tipsBox}>
              <Text style={S.tipsTitle}>Sound Tips</Text>
              <View style={S.tipRow}>
                <Lightbulb size={18} color="#3B82F6" weight="duotone" />
                <Text style={S.tipText}>Mix multiple sounds together for your perfect atmosphere</Text>
              </View>
              <View style={S.tipRow}>
                <Lightbulb size={18} color="#3B82F6" weight="duotone" />
                <Text style={S.tipText}>Nature sounds can improve focus and reduce anxiety</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Noise Tab */}
        {activeTab === 'noise' && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={S.section}>
              <Text style={S.sectionTitle}>Noise Generators</Text>
              <Text style={S.sectionSub}>Block distractions, stay focused</Text>
              {NOISE_SOUNDS.map(renderSoundCard)}
            </View>

            <TouchableOpacity
              style={S.featuredCard}
              activeOpacity={0.85}
              onPress={() => playMix(FEATURED_MIXES[1])}
            >
              <View style={S.featuredRow}>
                <Headphones size={28} color={MC.lime} weight="duotone" />
                <View style={S.featuredText}>
                  <Text style={S.featuredLabel}>Recommended Mix</Text>
                  <Text style={S.featuredTitle}>Deep Focus – Brown Noise + Café</Text>
                </View>
                <View style={S.featuredBtn}>
                  <Text style={S.featuredBtnText}>Play</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Ambient Tab */}
        {activeTab === 'ambient' && (
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={S.section}>
              <Text style={S.sectionTitle}>Ambient & Places</Text>
              <Text style={S.sectionSub}>Deep tones and cozy atmospheres</Text>
              {AMBIENT_SOUNDS.map(renderSoundCard)}
            </View>

            <View style={S.section}>
              <Text style={S.sectionTitle}>Featured Mixes</Text>
              <Text style={S.sectionSub}>Curated sound combinations</Text>
              <View style={S.mixGrid}>
                {FEATURED_MIXES.map((mix) => {
                  const MixIcon = mix.icon;
                  const isPlaying = mix.soundIds.every(id => activeSounds.has(id));
                  return (
                    <TouchableOpacity
                      key={mix.id}
                      style={[S.mixCard, { backgroundColor: mix.bg }]}
                      activeOpacity={0.85}
                      onPress={() => playMix(mix)}
                    >
                      <View style={[S.mixIconBox, { backgroundColor: `${mix.tint}15` }]}>
                        <MixIcon size={28} color={mix.tint} weight={isPlaying ? 'fill' : 'duotone'} />
                      </View>
                      <Text style={[S.mixTitle, { color: MC.text }]} numberOfLines={2}>{mix.label}</Text>
                      <Text style={S.mixType}>{mix.description}</Text>
                      <View style={S.mixFoot}>
                        <View style={S.mixDur}>
                          <MusicNote size={13} color={MC.textDim} />
                          <Text style={S.mixDurText}>{mix.soundIds.length} sounds</Text>
                        </View>
                        <View style={[S.mixPlay, { backgroundColor: isPlaying ? '#EF4444' : mix.tint }]}>
                          {isPlaying
                            ? <Stop size={16} color="#FFF" weight="fill" />
                            : <Play size={16} color="#FFF" weight="fill" />
                          }
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ── Styles (copied from MindfulnessScreen) ──────────────
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MC.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 100,
    maxWidth: 500,
    alignSelf: 'center' as const,
    width: '100%',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 24,
  },
  headerSub: {
    fontSize: 13,
    color: MC.textDim,
    fontFamily: MF.medium,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 32,
    color: MC.text,
    fontFamily: MF.bold,
    letterSpacing: -0.8,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MC.cardDark,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Stats Strip */
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: MC.lime,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  statsStripItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statsStripIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statsStripNum: {
    fontSize: 18,
    fontFamily: MF.bold,
    color: MC.text,
  },
  statsStripLabel: {
    fontSize: 11,
    fontFamily: MF.medium,
    color: MC.textDim,
  },
  statsStripDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  /* Now Playing */
  nowPlayingCard: {
    backgroundColor: MC.cardDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,
  },
  nowPlayingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  nowPlayingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: MC.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingTitle: {
    fontSize: 15,
    fontFamily: MF.semi,
    color: '#FFFFFF',
  },
  nowPlayingDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: MF.medium,
    marginBottom: 12,
  },
  stopAllBtn: {
    backgroundColor: MC.lime,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  stopAllBtnText: {
    fontSize: 14,
    color: MC.text,
    fontFamily: MF.semi,
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: MC.cardDark,
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 13,
  },
  tabActive: {
    backgroundColor: '#FFF',
  },
  tabText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: MF.semi,
  },
  tabTextActive: {
    color: MC.text,
  },

  /* Sections */
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    color: MC.text,
    fontFamily: MF.bold,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: MC.textDim,
    fontFamily: MF.medium,
    marginBottom: 16,
  },

  /* Sound Cards (= breathCard from Mindfulness) */
  breathCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
  },
  breathRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breathIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  breathInfo: {
    flex: 1,
    minWidth: 0,
  },
  breathTitle: {
    fontSize: 16,
    fontFamily: MF.bold,
    marginBottom: 3,
  },
  breathDesc: {
    fontSize: 13,
    color: MC.textDim,
    fontFamily: MF.medium,
    marginBottom: 8,
  },
  breathMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breathMetaText: {
    fontSize: 12,
    color: MC.textDim,
    fontFamily: MF.medium,
  },
  breathBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  breathBadgeText: {
    fontSize: 10,
    fontFamily: MF.semi,
  },
  breathPlay: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  /* Tips */
  tipsBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 15,
    fontFamily: MF.semi,
    color: MC.text,
    marginBottom: 14,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: MF.medium,
    color: MC.textDim,
    lineHeight: 19,
  },

  /* Featured card */
  featuredCard: {
    backgroundColor: MC.cardDark,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredText: {
    flex: 1,
  },
  featuredLabel: {
    fontSize: 11,
    fontFamily: MF.medium,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  featuredTitle: {
    fontSize: 15,
    fontFamily: MF.semi,
    color: '#FFFFFF',
  },
  featuredBtn: {
    backgroundColor: MC.lime,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  featuredBtnText: {
    fontSize: 13,
    fontFamily: MF.semi,
    color: MC.text,
  },

  /* Mix Grid (like meditGrid from Mindfulness) */
  mixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mixCard: {
    width: (width - 52) / 2,
    maxWidth: 230,
    borderRadius: 18,
    padding: 16,
  },
  mixIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mixTitle: {
    fontSize: 15,
    fontFamily: MF.semi,
    marginBottom: 2,
  },
  mixType: {
    fontSize: 12,
    fontFamily: MF.medium,
    color: MC.textDim,
    marginBottom: 12,
  },
  mixFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mixDur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mixDurText: {
    fontSize: 12,
    fontFamily: MF.medium,
    color: MC.textDim,
  },
  mixPlay: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
