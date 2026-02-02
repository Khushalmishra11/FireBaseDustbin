import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, ScrollView, Alert, PermissionsAndroid, Platform} from 'react-native';
import database from '@react-native-firebase/database';
import messaging from '@react-native-firebase/messaging';

export default function App() {
  const [allBins, setAllBins] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDustbins();
    
    // Setup FCM notifications
    setupFCMNotifications();
  }, []);

  // ========== FCM NOTIFICATION SETUP ==========
  const setupFCMNotifications = async () => {
    try {
      // Request notification permission (Android 13+)
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Dustbin Level Notifications',
            message: 'We need permission to send you dustbin fill level alerts',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission denied');
          return;
        }
      }

      // Get FCM token
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // Register token with backend
      await registerFCMTokenWithBackend(token);

      // Handle foreground notifications
      const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
        console.log('Foreground notification received:', remoteMessage);
        
        const title = remoteMessage.notification?.title || 'Dustbin Level Alert';
        const body = remoteMessage.notification?.body || 'Check your bin fill level';
        const level = remoteMessage.data?.level;
        const status = remoteMessage.data?.status;

        // Show alert with notification details
        Alert.alert(
          title,
          body + (level ? `\n\nCurrent Level: ${level}%\nStatus: ${status}` : ''),
          [{ text: 'OK' }],
        );

        // You can also update UI state here if needed
      });

      // Handle background notification tap
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification opened app:', remoteMessage);
        // Handle navigation or UI update when user taps notification
      });

      // Check if app was opened from notification
      const initialNotification = await messaging().getInitialNotification();
      if (initialNotification) {
        console.log('App opened from notification:', initialNotification);
      }

      // Refresh token when it changes
      const unsubscribeTokenRefresh = messaging().onTokenRefresh(token => {
        console.log('FCM Token refreshed:', token);
        registerFCMTokenWithBackend(token);
      });

      return () => {
        unsubscribeForeground();
        unsubscribeTokenRefresh();
      };
    } catch (error) {
      console.error('Error setting up FCM:', error);
    }
  };

  // Register FCM token with backend Cloud Function
  const registerFCMTokenWithBackend = async (token) => {
    try {
      // Get device ID (using a unique ID or your nodeMCU device ID)
      const deviceId = 'dustbin_01'; // Change this to your actual device ID

      const response = await fetch(
        'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/registerFCMToken',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId: deviceId,
            token: token,
            userId: 'user123', // Optional: add your user ID
          }),
        },
      );

      const result = await response.json();
      console.log('FCM token registered:', result);
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  };

  // ========== END FCM SETUP ==========

  const fetchDustbins = async () => {
    try {
      setLoading(true);
      const snapshot = await database().ref('dustbins').once('value');
      
      console.log('Snapshot exists:', snapshot.exists());
      console.log('Snapshot value:', snapshot.val());
      
      if (snapshot.exists()) {
        setAllBins(snapshot.val());
        setError(null);
      } else {
        setError('No data found at dustbins');
        setAllBins({});
      }
    } catch (err) {
      console.error('Firebase fetch error:', err);
      setError(err.message);
      setAllBins({});
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const binEntries = Object.entries(allBins || {});

  if (binEntries.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No dustbins available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Dustbin Monitor</Text>
        <Text style={styles.subtitle}>Total Bins: {binEntries.length}</Text>
        
        {binEntries.map(([binName, binData]) => (
          <View key={binName} style={styles.binCard}>
            <Text style={styles.binTitle}>{binName.toUpperCase()}</Text>
            
            <View style={styles.dataRow}>
              <Text style={styles.label}>Level:</Text>
              <Text style={[styles.levelValue, {color: getColorByLevel(binData?.level)}]}>
                {binData?.level !== undefined ? `${binData.level}%` : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.dataRow}>
              <Text style={styles.label}>Status:</Text>
              <View style={[styles.statusBadge, getStatusBgColor(binData?.status)]}>
                <Text style={styles.statusText}>
                  {binData?.status ? binData.status.replace('_', ' ').toUpperCase() : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const getColorByLevel = (level) => {
  if (level === undefined || level === null) return '#999';
  if (level >= 80) return '#FF3B30';
  if (level >= 50) return '#FF9500';
  return '#34C759';
};

const getStatusBgColor = (status) => {
  if (status === 'full') return {backgroundColor: '#FF3B30'};
  if (status === 'not_full') return {backgroundColor: '#34C759'};
  return {backgroundColor: '#999'};
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 16,
    marginTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  binCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  binTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  levelValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
});