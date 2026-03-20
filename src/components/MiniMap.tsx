import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

export const MiniMap = () => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: 40.730610,
          longitude: -73.935242,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        showsUserLocation={false} 
        showsMyLocationButton={false}
        showsCompass={false}
      />
    </View>
  );
};