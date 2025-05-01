// App.js
import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Animated, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapComponent from './src/components/MapComponent';
import BLEComponent from './src/components/BLEComponent';

const Tab = createBottomTabNavigator();

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Mapa') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'BLE') {
            iconName = focused ? 'bluetooth' : 'bluetooth-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name='Mapa' component={MapComponent} />
      <Tab.Screen name='BLE' component={BLEComponent} />
    </Tab.Navigator>
  );
}

export default function App() {
  // Estado para controlar la visibilidad de la barra lateral
  const [sidebarVisible, setSidebarVisible] = useState(false);
  // Valor animado para la transición
  const [sidebarWidth] = useState(new Animated.Value(0));

  // Función para alternar la visibilidad de la barra lateral
  const toggleSidebar = () => {
    const newValue = !sidebarVisible;
    setSidebarVisible(newValue);

    Animated.timing(sidebarWidth, {
      toValue: newValue ? 50 : 0, // Cambiado de 80 a 50 para que ocupe aproximadamente la mitad de la pantalla
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Convertir el valor animado a un porcentaje para el ancho
  const sidebarWidthPercent = sidebarWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      {/* Área principal con navegación */}
      <View style={styles.mainContainer}>
        <NavigationContainer>
          {/* Botón para mostrar/ocultar la barra lateral */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleSidebar}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sidebarVisible ? 'close' : 'menu'}
              size={24}
              color="white"
            />
          </TouchableOpacity>

          <MainNavigator />
        </NavigationContainer>
      </View>

      {/* Barra lateral deslizable */}
      <Animated.View
        style={[
          styles.sidebarContainer,
          { width: sidebarWidthPercent }
        ]}
      >
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* El contenido que se mostrará en la barra lateral */}
          <View style={styles.contentContainer}>
            {/* Sección de frecuencia cardíaca */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeader}>
                <Ionicons name="heart" size={22} color="tomato" />
                <Text style={styles.cardTitle}>Frecuencia Cardíaca</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardValue}># <Text style={styles.cardUnit}>bpm</Text></Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContainer: {
    flex: 1, // Toma todo el espacio disponible
  },
  sidebarContainer: {
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    overflow: 'hidden', // Para que no se vea el contenido fuera del área cuando está oculta
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 10,
    minHeight: Dimensions.get('window').height * 2, // Para forzar la aparición del scroll
  },
  toggleButton: {
    position: 'absolute',
    top: 20, // Cambiado de 40 a 20 para subir la posición del botón
    right: 20,
    backgroundColor: 'tomato',
    borderRadius: 5, // Forma cuadrada con esquinas ligeramente redondeadas
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999, // Para asegurar que esté por encima de otros elementos
    elevation: 5, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // Estilos para la sección de frecuencia cardíaca
  cardSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: 'tomato',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  cardValue: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#333',
  },
  cardUnit: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'normal',
  }
});