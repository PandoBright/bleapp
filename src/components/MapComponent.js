import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Linking, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import haversine from 'haversine-distance'; // npm install haversine-distance

const MapComponent = ({
  initialZoom = 18,
  updateInterval = 2000,      // 5 segundos por defecto
  minAccuracy = 30,           // metros máximos permitidos
  minDistance = 5,            // metros mínimos de movimiento reales
  customTileLayer,
  onLocationError,
}) => {
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const watchRef = useRef(null);
  const webViewRef = useRef(null);
  const prevCoordsRef = useRef(null);
  const [coords, setCoords] = useState({ latitude: 0, longitude: 0 });

  // Inyecta JS para mover el marcador suavemente
  const updateMapLocation = ({ latitude, longitude }) => {
    const js = `
      if (window.updateMarkerLocationSmooth) {
        window.updateMarkerLocationSmooth(${latitude}, ${longitude});
      }
    `;
    webViewRef.current?.injectJavaScript(js);
  };

  useEffect(() => {
    let mounted = true;

    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const err = new Error('Permiso de ubicación denegado');
        setLocationError(err);
        onLocationError?.(err);
        Alert.alert(
          'Permiso denegado',
          'Debes permitir acceso a la ubicación.',
          [
            { text: 'Abrir Configuración', onPress: () => Linking.openSettings() },
            { text: 'Cancelar', style: 'cancel' }
          ]
        );
        setLoading(false);
        return;
      }

      // Limpia suscripción previa
      if (watchRef.current) {
        watchRef.current.remove();
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: updateInterval,
          distanceInterval: 0, // manejamos la distancia con Haversine
        },
        loc => {
          if (!mounted) return;
          const { latitude, longitude, accuracy } = loc.coords;

          // 1) Filtrar por precisión
          if (accuracy > minAccuracy) {
            return;
          }

          const newCoords = { latitude, longitude };
          const prev = prevCoordsRef.current;

          // 2) Filtrar por distancia mínima real
          if (prev) {
            const meters = haversine(prev, newCoords);
            if (meters < minDistance) {
              return;
            }
          }

          // Guardar coords y desactivar loader
          setCoords(newCoords);
          prevCoordsRef.current = newCoords;
          setLoading(false);

          // 3) Animar marcador
          updateMapLocation(newCoords);
        }
      );
    };

    startWatching().catch(err => {
      setLocationError(err);
      onLocationError?.(err);
      Alert.alert('Error', 'No se pudo iniciar el seguimiento de ubicación.');
      setLoading(false);
    });

    return () => {
      mounted = false;
      watchRef.current?.remove();
    };
  }, [updateInterval, minAccuracy, minDistance, onLocationError]);

  const mapHTML = useMemo(() => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport"
              content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <link rel="stylesheet"
              href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css"/>
        <style> html, body, #map { margin:0; padding:0; height:100%; } </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
        <script>
          let map, marker, targetLat, targetLng;
          document.addEventListener('DOMContentLoaded', () => {
            // Inicializar mapa y marcador
            map = L.map('map').setView([${coords.latitude}, ${coords.longitude}], ${initialZoom});
            L.tileLayer('${customTileLayer ||
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);
            marker = L.marker([${coords.latitude}, ${coords.longitude}])
                       .addTo(map)
                       .bindPopup('Ubicación Actual')
                       .openPopup();

            // Transición suave
            window.updateMarkerLocationSmooth = (lat, lng) => {
              targetLat = lat;
              targetLng = lng;
              const animate = () => {
                const pos = marker.getLatLng();
                const newLat = pos.lat + (targetLat - pos.lat) * 0.1;
                const newLng = pos.lng + (targetLng - pos.lng) * 0.1;
                marker.setLatLng([newLat, newLng]);
                map.panTo([newLat, newLng], { animate: false });
                if (Math.abs(newLat - targetLat) > 0.00001 ||
                    Math.abs(newLng - targetLng) > 0.00001) {
                  requestAnimationFrame(animate);
                }
              };
              requestAnimationFrame(animate);
            };

            // Deshabilitar zoom táctil para no interferir
            map.scrollWheelZoom.disable();
            map.touchZoom.disable();
          });
        </script>
      </body>
    </html>
  `, [coords.latitude, coords.longitude, initialZoom, customTileLayer]);

  if (locationError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error de ubicación</Text>
        <Text style={styles.errorDetailText}>{locationError.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <ActivityIndicator style={styles.loader} size="large" color="tomato" />
      )}
      <WebView
        ref={webViewRef}
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
          Alert.alert('Error', 'No se pudo cargar el mapa.');
        }}
      />
    </View>
  );
};

export default MapComponent;

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loader: {
    position: 'absolute',
    top: '50%', left: '50%',
    marginLeft: -25, marginTop: -25,
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20
  },
  errorText: {
    fontSize: 18, color: 'red', marginBottom: 8
  },
  errorDetailText: {
    fontSize: 14, color: 'gray', textAlign: 'center'
  },
});
