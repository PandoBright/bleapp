// src/componentes/BLEComponent.js
import React, { useState, useEffect } from 'react';
import { View,Text,Button,SectionList,PermissionsAndroid,Platform,Alert,TouchableOpacity,StyleSheet,} from 'react-native';
import { BleManager } from 'react-native-ble-plx';

const BLEComponent = () => {
  const [devices, setDevices] = useState([]);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const manager = new BleManager();

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);

        if (
          granted['android.permission.ACCESS_FINE_LOCATION'] !==
            PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_SCAN'] !==
            PermissionsAndroid.RESULTS.GRANTED ||
          granted['android.permission.BLUETOOTH_CONNECT'] !==
            PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert(
            'Permisos necesarios',
            'Por favor, otorga los permisos para escanear dispositivos.'
          );
        }
      } catch (error) {
        console.error('Error al solicitar permisos:', error);
      }
    }
  };

  const scanDevices = () => {
    setDevices([]);
    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        Alert.alert('Error en el escaneo', error.message);
        return;
      }
      if (device && device.name) {
        setDevices((prevDevices) => {
          const exists = prevDevices.some((d) => d.id === device.id);
          return exists ? prevDevices : [...prevDevices, device];
        });
      }
    });
  };

  const connectToDevice = async (device) => {
    try {
      console.log(`Conectando a ${device.name}...`);
      const connectedDevice = await manager.connectToDevice(device.id);
      await connectedDevice.discoverAllServicesAndCharacteristics();

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
      <Button title='Escanear' onPress={scanDevices} />
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
});
