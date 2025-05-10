// BLEComponent_dynamic.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Button,
  SectionList,
  PermissionsAndroid,
  Platform,
  Alert,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer'; // para decodificar base64

const BLEComponent = () => {
  const [devices, setDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [lastValue, setLastValue] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const bleManager = useRef(new BleManager()).current;
  const subscriptionsRef = useRef({}); // { deviceId: [sub1, sub2, ...] }

  useEffect(() => {
    requestPermissions();
    return () => {
      // Detener escaneo
      bleManager.stopDeviceScan();
      // Limpiar suscripciones y desconectar dispositivos
      connectedDevices.forEach(device => disconnectDevice(device));
      bleManager.destroy();
    };
  }, [connectedDevices]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);
        const ok = Object.values(granted).every(
          status => status === PermissionsAndroid.RESULTS.GRANTED
        );
        if (!ok) {
          Alert.alert('Permisos requeridos', 'Necesitas permitir BLE para continuar.');
        }
      } catch (err) {
        console.error('Error solicitando permisos:', err);
      }
    }
  };

  const scanDevices = () => {
    setDevices([]);
    setIsScanning(true);
    const found = new Set();

    bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) {
        Alert.alert('Error de escaneo', error.message);
        setIsScanning(false);
        return;
      }
      if (device && !found.has(device.id)) {
        found.add(device.id);
        setDevices(old => [...old, device]);
      }
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
      Alert.alert('Escaneo finalizado', 'Parado el escaneo de dispositivos.');
    }, 10000);
  };

  const connectAndDiscoverAll = async (device) => {
    try {
      const d = await bleManager.connectToDevice(device.id);
      await d.discoverAllServicesAndCharacteristics();

      // Inicializar array de suscripciones para este dispositivo
      subscriptionsRef.current[d.id] = [];

      // Obtener todos los servicios
      const services = await d.services();
      for (const svc of services) {
        // Para cada servicio, obtener características
        const chars = await d.characteristicsForService(svc.uuid);
        for (const ch of chars) {
          // Leer valor si es legible
          if (ch.isReadable) {
            const read = await d.readCharacteristicForService(svc.uuid, ch.uuid);
            const buf = Buffer.from(read.value, 'base64');
            console.log(`Leer [${svc.uuid}][${ch.uuid}]:`, buf.toString('hex'));
          }
          // Suscribir si es notifiable
          if (ch.isNotifiable) {
            const sub = d.monitorCharacteristicForService(
              svc.uuid,
              ch.uuid,
              (err, char) => {
                if (err) {
                  console.error('Monitor error', err);
                  return;
                }
                if (char?.value) {
                  const bufN = Buffer.from(char.value, 'base64');
                  console.log(`Notif [${svc.uuid}][${ch.uuid}]:`, bufN);
                  setLastValue(bufN.readUIntLE(0, bufN.length));
                }
              }
            );
            subscriptionsRef.current[d.id].push(sub);
          }
        }
      }

      setConnectedDevices(old => [...old, d]);
      Alert.alert('Conectado', `Conectado a ${device.name ?? 'Sin nombre'}`);
    } catch (err) {
      Alert.alert('Error conexión', err.message);
    }
  };

  const disconnectDevice = async (device) => {
    try {
      // Quitar suscripciones
      const subs = subscriptionsRef.current[device.id] || [];
      subs.forEach(sub => sub.remove());
      delete subscriptionsRef.current[device.id];

      // Cancelar conexión
      await device.cancelConnection();
      setConnectedDevices(old => old.filter(d => d.id !== device.id));
      Alert.alert('Desconectado', `${device.name ?? device.id} desconectado.`);
    } catch (err) {
      console.error('Error al desconectar:', err);
    }
  };

  const sections = [
    { title: 'Conectados', data: connectedDevices },
    { title: 'Disponibles', data: devices },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BLE Scan</Text>
      <Button
        title={isScanning ? 'Escaneando...' : 'Escanear BLE'}
        onPress={scanDevices}
        disabled={isScanning}
      />
      {isScanning && <ActivityIndicator style={{ marginTop: 8 }} />}

      {lastValue !== null && (
        <Text style={styles.lastValue}>Último valor: {lastValue}</Text>
      )}

      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.header}>{title}</Text>
        )}
        renderItem={({ item, section }) =>
          section.title === 'Conectados' ? (
            <View style={styles.connectedRow}>
              <Text style={styles.connected}>✅ {item.name ?? 'Sin nombre'}</Text>
              <Button title="Desconectar" onPress={() => disconnectDevice(item)} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.device}
              onPress={() => connectAndDiscoverAll(item)}
            >
              <Text>{item.name ?? 'Sin nombre'}</Text>
              {item.serviceUUIDs?.length > 0 && (
                <Text style={styles.subInfo}>
                  Serv: {item.serviceUUIDs.join(', ')}
                </Text>
              )}
              {item.manufacturerData && (
                <Text style={styles.subInfo}>
                  Manu: {Buffer.from(item.manufacturerData, 'base64').toString('hex')}
                </Text>
              )}
            </TouchableOpacity>
          )
        }
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

export default BLEComponent;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, textAlign: 'center', marginBottom: 12 },
  header: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  device: {
    padding: 12,
    backgroundColor: '#e0f7fa',
    marginVertical: 4,
    borderRadius: 8,
  },
  connectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  connected: { color: 'green' },
  lastValue: { fontSize: 18, textAlign: 'center', marginVertical: 12, color: 'blue' },
  subInfo: { fontSize: 12, color: '#555' },
});
