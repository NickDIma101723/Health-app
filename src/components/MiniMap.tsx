import React from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN, getMapStyle } from '../lib/mapStyle';

Mapbox.setAccessToken(MAPBOX_TOKEN);

export const MiniMap = () => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL={getMapStyle()}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        attributionEnabled={false}
        logoEnabled={false}
        compassEnabled={false}
      >
        <Mapbox.Camera
          defaultSettings={{
            centerCoordinate: [-73.935242, 40.730610],
            zoomLevel: 13,
          }}
        />
      </Mapbox.MapView>
    </View>
  );
};