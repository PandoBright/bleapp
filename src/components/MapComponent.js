import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const MapComponent = () => {
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState({ latitude: 3.4142959, longitude: -76.5320044 });

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se requiere acceso a la ubicación para mostrar el mapa.');
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});
        setCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        Alert.alert('Error', 'No se pudo obtener la ubicación del dispositivo.');
      }
    })();
  }, []);

  const { latitude, longitude } = coords;

  const mapHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          #map { height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            var map = L.map('map').setView([${latitude}, ${longitude}], 18);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
            }).addTo(map);
            L.marker([${latitude}, ${longitude}]).addTo(map)
              .bindPopup('Ubicación Actual')
              .openPopup();
          });
        </script>
      </body>
    </html>
  `, [latitude, longitude]);

  return (
    <View style={styles.mapContainer}>
      {loading && <ActivityIndicator size="large" color="tomato" style={styles.loader} />}
      <WebView
        originWhitelist={['*']}
        source={{ html: mapHTML }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          Alert.alert("Error", "No se pudo cargar el mapa.");
        }}
      />
    </View>
  );
};

export default MapComponent;

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
  },
});
