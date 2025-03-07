// src/componentes/MapComponent.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const MapComponent = () => {
  const latitude = 3.4142959;
  const longitude = -76.5320044;

  const mapHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css"
        />
        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          #map { height: 100%; width: 100%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
        <script>
          var map = L.map('map').setView([${latitude}, ${longitude}], 18);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          }).addTo(map);
          L.marker([${latitude}, ${longitude}]).addTo(map)
            .bindPopup('Ubicación')
            .openPopup();
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.mapContainer}>
      <WebView
        originWhitelist={['*']}
        source={{
          uri: 'data:text/html;charset=utf-8,' + encodeURIComponent(mapHTML),
        }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode='always'
      />
    </View>
  );
};

export default MapComponent;

const styles = StyleSheet.create({
  mapContainer: {
    height: '100%',
    width: '100%',
    borderWidth: 2,
    borderColor: 'red',
  },
  webview: {
    flex: 1,
  },
});
