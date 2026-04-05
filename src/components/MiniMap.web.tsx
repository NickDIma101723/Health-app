import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MAPBOX_TOKEN, getWebMapStylePath } from '../lib/mapStyle';

function buildMiniMapHtml(token: string, lat: number, lon: number, zoom: number) {
  const style = getWebMapStylePath();
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"><\/script>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet">
<style>body{margin:0;padding:0}#map{position:absolute;top:0;bottom:0;width:100%}.mapboxgl-ctrl{display:none!important}</style>
</head><body>
<div id="map"></div>
<script>
try{
mapboxgl.accessToken='${token}';
var m=new mapboxgl.Map({container:'map',style:'mapbox://styles/${style}',center:[${lon},${lat}],zoom:${zoom},interactive:false,attributionControl:false,collectResourceTiming:false,transformRequest:function(url){if(url.indexOf('events.mapbox.com')!==-1)return{url:'data:,'};return{url};}});
m.on('load',function(){parent.postMessage('minimap-ok','*');});
}catch(e){}
<\/script>
</body></html>`;
}

export const MiniMap = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data === 'minimap-ok') setReady(true);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!MAPBOX_TOKEN) {
    return <Fallback />;
  }

  const mapHtml = buildMiniMapHtml(MAPBOX_TOKEN, -73.9352, 40.7306, 13);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {!ready && <Fallback />}
      <View style={[StyleSheet.absoluteFillObject, { opacity: ready ? 1 : 0 }]}>
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          srcDoc={mapHtml}
          sandbox="allow-scripts allow-same-origin"
          style={{ border: 0, display: 'block' }}
          title="Mini Map Preview"
        />
      </View>
    </View>
  );
};

const Fallback = () => (
  <View style={[StyleSheet.absoluteFillObject, s.fallback]} pointerEvents="none">
    <View style={s.dot} />
    <View style={s.ring} />
    <View style={s.badge}>
      <Text style={s.badgeText}>Activity Map</Text>
    </View>
  </View>
);

const s = StyleSheet.create({
  fallback: {
    backgroundColor: '#141414',
  },
  dot: {
    position: 'absolute',
    top: '44%',
    left: '48%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  ring: {
    position: 'absolute',
    top: '40%',
    left: '45%',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  badge: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.5,
  },
});
