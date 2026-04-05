import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  Barcode,
  Lightning,
  Fire,
  Barbell,
  Drop,
  Cookie,
  Warning,
  ScanSmiley,
  Flashlight,
  Info,
} from 'phosphor-react-native';

const { width } = Dimensions.get('window');

const C = {
  bg: '#FAFAFA', card: '#FFFFFF', cardDark: '#111111',
  accent: '#10B981', accentSoft: '#ECFDF5', lime: '#D4F940',
  warmBg: '#F5F0EB', text: '#1A1A1A', dim: '#8C8C8C',
  border: '#EEEEEE', red: '#EF4444', amber: '#F59E0B',
  blue: '#3B82F6', purple: '#8B5CF6', teal: '#14B8A6',
} as const;

const F = {
  bold: 'PlusJakartaSans_700Bold',
  semi: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
  regular: 'PlusJakartaSans_400Regular',
} as const;

interface BarcodeScannerScreenProps {
  onNavigate?: (screen: string) => void;
}

interface NutrientInfo {
  name: string;
  brand: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  image?: string;
  score?: string;
  scoreColor?: string;
}

export const BarcodeScannerScreen: React.FC<BarcodeScannerScreenProps> = ({ onNavigate }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<NutrientInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const scanLock = useRef(false);

  const fetchProduct = useCallback(async (barcode: string) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setLoading(true);
    setError(null);
    setProduct(null);
    setScanned(true);

    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,serving_size,nutriments,nutriscore_grade,image_front_small_url`,
      );
      if (!res.ok) throw new Error('Network error');
      const json = await res.json();

      if (json.status !== 1 || !json.product) {
        setError('Product not found. Try another barcode.');
        setLoading(false);
        scanLock.current = false;
        return;
      }

      const p = json.product;
      const n = p.nutriments || {};

      const gradeColors: Record<string, string> = {
        a: '#10B981', b: '#84CC16', c: '#F59E0B', d: '#F97316', e: '#EF4444',
      };
      const grade = (p.nutriscore_grade || '').toLowerCase();

      setProduct({
        name: p.product_name || 'Unknown product',
        brand: p.brands || 'Unknown brand',
        serving: p.serving_size || '100 g',
        calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
        protein: Math.round((n.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((n.fat_100g || 0) * 10) / 10,
        fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
        sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
        sodium: Math.round((n.sodium_100g || 0) * 1000),
        image: p.image_front_small_url,
        score: grade ? grade.toUpperCase() : undefined,
        scoreColor: gradeColors[grade] || C.dim,
      });
    } catch {
      setError('Failed to look up product. Check your connection.');
    } finally {
      setLoading(false);
      scanLock.current = false;
    }
  }, []);

  const handleBarCodeScanned = useCallback(
    (result: { data: string }) => {
      if (scanned || scanLock.current) return;
      fetchProduct(result.data);
    },
    [scanned, fetchProduct],
  );

  const handleScanAgain = () => {
    setScanned(false);
    setProduct(null);
    setError(null);
  };

  // ── Permission states ──
  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.permWrap}>
          <View style={s.permIcon}>
            <Barcode size={48} color={C.accent} weight="duotone" />
          </View>
          <Text style={s.permTitle}>Camera Access Needed</Text>
          <Text style={s.permSub}>
            Allow camera access to scan barcodes and instantly see nutrition info for any product.
          </Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.85}>
            <Text style={s.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.backLink} onPress={() => onNavigate?.('nutrition')}>
            <Text style={s.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Macro ring helper ──
  const MacroRing = ({ value, max, color, label, unit }: {
    value: number; max: number; color: string; label: string; unit: string;
  }) => {
    const R = 28;
    const CIRC = 2 * Math.PI * R;
    const pct = Math.min(value / (max || 1), 1);
    return (
      <View style={s.macroItem}>
        <Svg width={64} height={64}>
          <Circle cx={32} cy={32} r={R} stroke={C.border} strokeWidth={5} fill="none" />
          <Circle cx={32} cy={32} r={R} stroke={color} strokeWidth={5} fill="none"
            strokeDasharray={`${pct * CIRC} ${CIRC}`}
            strokeLinecap="round" transform="rotate(-90, 32, 32)" />
        </Svg>
        <Text style={[s.macroVal, { color }]}>{value}{unit}</Text>
        <Text style={s.macroLabel}>{label}</Text>
      </View>
    );
  };

  // ── Main render ──
  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.headerBtn} onPress={() => onNavigate?.('nutrition')}>
          <ArrowLeft size={22} color="#FFF" weight="bold" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan Product</Text>
        <TouchableOpacity style={s.headerBtn} onPress={() => setTorch(t => !t)}>
          {torch
            ? <Lightning size={22} color={C.lime} weight="fill" />
            : <Lightning size={22} color="#FFF" weight="bold" />}
        </TouchableOpacity>
      </View>

      {/* Camera */}
      {!scanned && (
        <View style={s.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] }}
            onBarcodeScanned={handleBarCodeScanned}
          />
          {/* Scan overlay */}
          <View style={s.overlay}>
            <View style={s.scanBox}>
              {/* Corner decorations */}
              <View style={[s.corner, s.cornerTL]} />
              <View style={[s.corner, s.cornerTR]} />
              <View style={[s.corner, s.cornerBL]} />
              <View style={[s.corner, s.cornerBR]} />
            </View>
            <Animated.Text entering={FadeIn.delay(500).duration(600)} style={s.scanHint}>
              Point camera at a barcode
            </Animated.Text>
          </View>
        </View>
      )}

      {/* Results */}
      {scanned && (
        <ScrollView style={s.resultScroll} contentContainerStyle={s.resultContent} showsVerticalScrollIndicator={false}>
          {loading && (
            <Animated.View entering={FadeInDown.duration(300)} style={s.loadingWrap}>
              <ActivityIndicator color={C.accent} size="large" />
              <Text style={s.loadingText}>Looking up product…</Text>
            </Animated.View>
          )}

          {error && !loading && (
            <Animated.View entering={FadeInDown.duration(300)} style={s.errorWrap}>
              <Warning size={40} color={C.amber} weight="duotone" />
              <Text style={s.errorTitle}>Not Found</Text>
              <Text style={s.errorSub}>{error}</Text>
              <TouchableOpacity style={s.scanAgainBtn} onPress={handleScanAgain} activeOpacity={0.85}>
                <Text style={s.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {product && !loading && (
            <>
              {/* Product header */}
              <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.productCard}>
                <View style={s.productTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.productName}>{product.name}</Text>
                    <Text style={s.productBrand}>{product.brand}</Text>
                    <Text style={s.productServing}>Per {product.serving}</Text>
                  </View>
                  {product.score && (
                    <View style={[s.scoreBadge, { backgroundColor: product.scoreColor }]}>
                      <Text style={s.scoreText}>{product.score}</Text>
                    </View>
                  )}
                </View>
              </Animated.View>

              {/* Calorie hero */}
              <Animated.View entering={FadeInDown.delay(200).duration(400)} style={s.calCard}>
                <View style={s.calLeft}>
                  <Fire size={28} color={C.amber} weight="fill" />
                  <View>
                    <Text style={s.calValue}>{product.calories}</Text>
                    <Text style={s.calUnit}>kcal / 100g</Text>
                  </View>
                </View>
                <Text style={s.calLabel}>Energy</Text>
              </Animated.View>

              {/* Macro rings */}
              <Animated.View entering={FadeInDown.delay(300).duration(400)} style={s.macroCard}>
                <Text style={s.sectionTitle}>Macronutrients</Text>
                <View style={s.macroRow}>
                  <MacroRing value={product.protein} max={50} color={C.blue} label="Protein" unit="g" />
                  <MacroRing value={product.carbs} max={100} color={C.amber} label="Carbs" unit="g" />
                  <MacroRing value={product.fat} max={70} color={C.red} label="Fat" unit="g" />
                </View>
              </Animated.View>

              {/* Extra nutrients */}
              <Animated.View entering={FadeInDown.delay(400).duration(400)} style={s.extraCard}>
                <Text style={s.sectionTitle}>More Details</Text>
                {[
                  { label: 'Fiber', value: `${product.fiber}g`, color: C.teal },
                  { label: 'Sugar', value: `${product.sugar}g`, color: C.purple },
                  { label: 'Sodium', value: `${product.sodium}mg`, color: C.dim },
                ].map((row) => (
                  <View key={row.label} style={s.extraRow}>
                    <View style={[s.extraDot, { backgroundColor: row.color }]} />
                    <Text style={s.extraLabel}>{row.label}</Text>
                    <Text style={s.extraVal}>{row.value}</Text>
                  </View>
                ))}
              </Animated.View>

              {/* Scan again */}
              <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                <TouchableOpacity style={s.scanAgainBtn} onPress={handleScanAgain} activeOpacity={0.85}>
                  <Barcode size={20} color="#FFF" weight="bold" />
                  <Text style={s.scanAgainText}>Scan Another Product</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const CORNER = 24;

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cardDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 10,
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 16, fontFamily: F.semi, color: '#FFF' },

  // Camera
  cameraWrap: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  scanBox: {
    width: width * 0.7, height: width * 0.42,
    borderRadius: 16, position: 'relative',
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: C.lime, borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  scanHint: {
    marginTop: 28, fontSize: 14, fontFamily: F.medium, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  // Results scroll
  resultScroll: { flex: 1, backgroundColor: C.bg },
  resultContent: { padding: 20, paddingTop: Platform.OS === 'ios' ? 100 : 64, paddingBottom: 40 },

  // Loading
  loadingWrap: { alignItems: 'center', paddingTop: 80, gap: 14 },
  loadingText: { fontSize: 15, fontFamily: F.medium, color: C.dim },

  // Error
  errorWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  errorTitle: { fontSize: 20, fontFamily: F.bold, color: C.text },
  errorSub: { fontSize: 14, fontFamily: F.regular, color: C.dim, textAlign: 'center', lineHeight: 20 },

  // Product card
  productCard: {
    backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 12,
  },
  productTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  productName: { fontSize: 20, fontFamily: F.bold, color: C.text, marginBottom: 2 },
  productBrand: { fontSize: 14, fontFamily: F.medium, color: C.dim, marginBottom: 4 },
  productServing: { fontSize: 12, fontFamily: F.regular, color: C.accent },
  scoreBadge: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  scoreText: { fontSize: 18, fontFamily: F.bold, color: '#FFF' },

  // Calorie card
  calCard: {
    backgroundColor: '#FFF8ED', borderRadius: 20, padding: 20, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  calLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calValue: { fontSize: 32, fontFamily: F.bold, color: C.text },
  calUnit: { fontSize: 12, fontFamily: F.medium, color: C.dim },
  calLabel: { fontSize: 13, fontFamily: F.semi, color: C.amber },

  // Macros
  macroCard: { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontFamily: F.bold, color: C.text, marginBottom: 16 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', gap: 4 },
  macroVal: { fontSize: 15, fontFamily: F.bold, marginTop: -4 },
  macroLabel: { fontSize: 12, fontFamily: F.medium, color: C.dim },

  // Extra details
  extraCard: { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 16 },
  extraRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  extraDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  extraLabel: { flex: 1, fontSize: 14, fontFamily: F.medium, color: C.text },
  extraVal: { fontSize: 14, fontFamily: F.bold, color: C.text },

  // Scan again
  scanAgainBtn: {
    flexDirection: 'row', gap: 8, backgroundColor: C.cardDark, borderRadius: 100,
    height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  scanAgainText: { fontSize: 15, fontFamily: F.bold, color: '#FFF' },

  // Permission screen
  permWrap: {
    flex: 1, backgroundColor: C.bg,
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  permIcon: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: C.accentSoft, justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  permTitle: { fontSize: 22, fontFamily: F.bold, color: C.text, marginBottom: 8 },
  permSub: { fontSize: 14, fontFamily: F.regular, color: C.dim, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  permBtn: {
    backgroundColor: C.cardDark, borderRadius: 100, paddingVertical: 16, paddingHorizontal: 40,
  },
  permBtnText: { fontSize: 16, fontFamily: F.bold, color: '#FFF' },
  backLink: { marginTop: 16 },
  backLinkText: { fontSize: 14, fontFamily: F.semi, color: C.accent },
});
