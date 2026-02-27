import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getWebMapIframeSrc } from '../lib/mapStyle';

export const MiniMap = () => {
  const iframeSrc = getWebMapIframeSrc(40.7306, -73.9352, 13, false);

  return (
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#E5E5EA' }]} pointerEvents="none">
      <iframe 
        width="100%" 
        height="100%" 
        frameBorder="0" 
        scrolling="no" 
        src={iframeSrc} 
        style={{ border: 0 }} 
        title="Mini Map Preview"
      />
    </View>
  );
};