import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, ScrollView, PermissionsAndroid, Platform, Alert} from 'react-native';
import database from '@react-native-firebase/database';
import messaging from '@react-native-firebase/messaging';

// Handle background messages
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background notification:', remoteMessage.notification?.title);
});

export default function App() {
  const [allBins, setAllBins] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    // Request notification permission
    const requestNotificationPermission = async () => {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          console.log('Notification permission:', granted);
        } catch (err) {
          console.error('Permission error:', err);
        }
      }
    };

    requestNotificationPermission();

    // Get FCM token
    const getFCMToken = async () => {
      try {
        const token = await messaging().getToken();
        if (token) {
          setFcmToken(token);
          await database().ref('/fcmToken').set(token);
          console.log('FCM Token saved to database');
        }
      } catch (err) {
        console.error('FCM token error:', err);
      }
    };

    getFCMToken();

    // Listen for foreground messages - SHOW POPUP ALERT
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Notification received:', remoteMessage.notification?.title);
      Alert.alert(
        remoteMessage.notification?.title || 'Dustbin Alert',
        remoteMessage.notification?.body || 'Check your dustbin',
        [{text: 'OK', onPress: () => console.log('Alert dismissed')}]
      );
    });

    // Listen for token refresh
    const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
      setFcmToken(newToken);
      await database().ref('/fcmToken').set(newToken);
      console.log('Token refreshed');
    });

    return () => {
      unsubscribeForeground();
      unsubscribeTokenRefresh();
    };
  }, []);

  useEffect(() => {
    // Real-time database listener
    const dbRef = database().ref('dustbins');
    
    const onValueChange = snapshot => {
      setLoading(false);
      
      if (snapshot.exists()) {
        setAllBins(snapshot.val());
        setError(null);
      } else {
        setError('No data found');
        setAllBins({});
      }
    };

    const onError = err => {
      console.error('Firebase error:', err);
      setError(err.message);
      setLoading(false);
    };

    dbRef.on('value', onValueChange, onError);
    return () => dbRef.off('value', onValueChange);
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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

    const binEntries = Object.entries(allBins);
    
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
          
          {fcmToken && (
            <View style={styles.fcmStatusCard}>
              <Text style={styles.fcmStatusLabel}>✓ Notifications Enabled</Text>
              <Text style={styles.fcmTokenPreview}>Token: {fcmToken.substring(0, 20)}...</Text>
            </View>
          )}
          
          {binEntries.map(([binName, binData]) => {
            const level = binData?.level ?? 0;
            const status = binData?.status ?? 'unknown';
            
            return (
              <View key={binName} style={styles.binCard}>
                <Text style={styles.binTitle}>{binName.toUpperCase()}</Text>
                
                <View style={styles.dataRow}>
                  <Text style={styles.label}>Level:</Text>
                  <Text style={[styles.levelValue, {color: getColorByLevel(level)}]}>
                    {level}%
                  </Text>
                </View>
                
                <View style={styles.dataRow}>
                  <Text style={styles.label}>Status:</Text>
                  <View style={[styles.statusBadge, getStatusBgColor(status)]}>
                    <Text style={styles.statusText}>
                      {status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return <View style={styles.mainContainer}>{renderContent()}</View>;
}

const getColorByLevel = level => {
  if (level >= 80) return '#FF0000';
  if (level >= 60) return '#FFA500';
  return '#4CAF50';
};

const getStatusBgColor = status => {
  if (status === 'critical') return {backgroundColor: '#FF0000'};
  if (status === 'warning') return {backgroundColor: '#FFA500'};
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
  mainContainer: {
    flex: 1,
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
  fcmStatusCard: {
    backgroundColor: '#d4edda',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  fcmStatusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
  },
  fcmTokenPreview: {
    fontSize: 11,
    color: '#155724',
    marginTop: 6,
    fontFamily: 'monospace',
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
    color: '#FF0000',
    fontWeight: '600',
    textAlign: 'center',
  },
});
