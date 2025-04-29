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
} from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer'; // 👈 importante para decodificar base64

const SERVICE_UUID = '12345678-1234-1234-1234-1234567890ab'; // 👈 cambia aquí
const CHARACTERISTIC_UUID = 'abcd1234-ab12-cd34-ef56-1234567890ab'; // 👈 cambia aquí

const BLEComponent = () => {
  const [devices, setDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [lastValue, setLastValue] = useState(null); // 👈 valor que notificará el ESP32
  const bleManager = useRef(new BleManager()).current;

  useEffect(() => {
    requestPermissions();

    return () => {
      bleManager.stopDeviceScan();
      bleManager.destroy();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);

        if (
          granted['android.permission.ACCESS_FINE_LOCATION'] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_SCAN'] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_CONNECT'] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert('Permisos requeridos', 'Se necesitan permisos para escanear dispositivos.');
        }
      } catch (error) {
        console.error('Error al solicitar permisos:', error);
      }
    }
  };

  const scanDevices = () => {
    setDevices([]);
    const foundDevices = new Set();

    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        Alert.alert('Error en el escaneo', error.message);
        return;
      }
      if (device && device.name && !foundDevices.has(device.id)) {
        foundDevices.add(device.id);
        setDevices((prevDevices) => [...prevDevices, device]);
      }
    });

    setTimeout(() => {
      bleManager.stopDeviceScan();
      Alert.alert('Escaneo finalizado', 'Se detuvo el escaneo de dispositivos.');
    }, 10000);
  };

  const connectToDevice = async (device) => {
    try {
      console.log(`Conectando a ${device.name}...`);
      const connectedDevice = await bleManager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // **Suscribirse para recibir notificaciones**
      connectedDevice.monitorCharacteristicForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (error, characteristic) => {
          if (error) {
            console.error('Error en monitor:', error);
            return;
          }
          const valueBase64 = characteristic?.value;
          if (valueBase64) {
            const buffer = Buffer.from(valueBase64, 'base64');
            const numero = buffer.readUInt32LE(0);
            console.log(`Notificación recibida: ${numero}`);
            setLastValue(numero); // 👈 Actualizamos el valor mostrado
          }
        }
      );

      setConnectedDevices((prevDevices) => [...prevDevices, connectedDevice]);
      Alert.alert('Conectado', `Conectado a ${device.name}`);
    } catch (error) {
      Alert.alert('Error al conectar', error.message);
    }
  };

  const sections = [
    { title: 'Dispositivos Conectados', data: connectedDevices },
    { title: 'Dispositivos Disponibles', data: devices },
  ];

  return (
    <View style={styles.bleContainer}>
      <Text style={styles.title}>Escaneo de Dispositivos BLE</Text>
      <Button title="Escanear" onPress={scanDevices} />
      {lastValue !== null && (
        <View style={styles.valueContainer}>
          <Text style={styles.lastValue}>Último valor recibido: {lastValue}</Text>
        </View>
      )}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, section }) => {
          if (section.title === 'Dispositivos Conectados') {
            return (
              <Text style={styles.connectedDevice}>
                ✅ {item.name || 'Dispositivo'} ({item.id})
              </Text>
            );
          }
          return (
            <TouchableOpacity
              onPress={() => connectToDevice(item)}
              style={styles.deviceButton}
            >
              <Text>
                {item.name} ({item.id})
              </Text>
            </TouchableOpacity>
          );
        }}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.subtitle}>{title}</Text>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

export default BLEComponent;

const styles = StyleSheet.create({
  bleContainer: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 20,
    marginBottom: 5,
    fontSize: 16,
    fontWeight: 'bold',
  },
  connectedDevice: {
    color: 'green',
    paddingVertical: 5,
  },
  deviceButton: {
    padding: 10,
    backgroundColor: '#3ddd',
    marginVertical: 5,
  },
  valueContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  lastValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'blue',
  },
});
