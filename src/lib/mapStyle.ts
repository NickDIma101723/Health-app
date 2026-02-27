const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

// Custom style for day, Mapbox built-in styles for other times
const STYLES = {
  day: 'mapbox://styles/nik0d/cmn4mjkgp000l01qs4exp1tph',
  dawn: 'mapbox://styles/mapbox/light-v11',
  dusk: 'mapbox://styles/mapbox/navigation-night-v1',
  night: 'mapbox://styles/mapbox/dark-v11',
};

// Web iframe equivalents
const WEB_STYLES = {
  day: 'nik0d/cmn4mjkgp000l01qs4exp1tph',
  dawn: 'mapbox/light-v11',
  dusk: 'mapbox/navigation-night-v1',
  night: 'mapbox/dark-v11',
};

type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 18) return 'day';
  if (hour >= 18 && hour < 20) return 'dusk';
  return 'night';
}

export function getMapStyle(): string {
  return STYLES[getTimeOfDay()];
}

export function getWebMapStylePath(): string {
  return WEB_STYLES[getTimeOfDay()];
}

export function getWebMapIframeSrc(lat: number, lon: number, zoom: number, zoomwheel = true): string {
  const style = getWebMapStylePath();
  return `https://api.mapbox.com/styles/v1/${style}.html?title=false&access_token=${MAPBOX_TOKEN}&zoomwheel=${zoomwheel}&fresh=true#${zoom}/${lat}/${lon}`;
}

export { MAPBOX_TOKEN };
