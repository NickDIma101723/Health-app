import React from 'react';
import { View, StyleSheet } from 'react-native';

export const MiniMap = () => {
  const lat = 40.730610;
  const lon = -73.935242;
  const bbox = `${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}`;
  const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E5E5EA' }]} pointerEvents="none">
      <iframe 
        width="100%" 
        height="100%" 
        frameBorder="0" 
        scrolling="no" 
        src={iframeSrc} 
        style={{ border: 0, filter: 'saturate(0.5)' }} 
        title="Mini Map Preview"
      />
    </View>
  );
};