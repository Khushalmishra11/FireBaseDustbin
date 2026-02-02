/*
  NodeMCU + Ultrasonic Sensor → Firebase Dustbin Fill Level Monitor
  
  This code reads dustbin fill level from an HC-SR04 ultrasonic sensor
  and sends it to Firebase Realtime Database every 5 seconds.
  
  Hardware:
  - NodeMCU ESP32
  - HC-SR04 Ultrasonic Sensor (Trigger: GPIO4, Echo: GPIO5)
  - Dustbin/Garbage bin
  
  Setup:
  1. Install ESP32 board in Arduino IDE
  2. Install Firebase library
  3. Fill in WiFi and Firebase credentials below
*/

#include <WiFi.h>
#include <FirebaseESP32.h>

// ============= CONFIGURATION =============

// WiFi Credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Credentials
#define FIREBASE_HOST "your-project-id.firebaseio.com"
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET"

// Sensor Pins
#define TRIGGER_PIN 4  // GPIO4 (D2)
#define ECHO_PIN 5     // GPIO5 (D1)

// Dustbin Configuration
#define BIN_HEIGHT_CM 200         // Your dustbin height in cm
#define DEVICE_ID "dustbin_01"    // Unique device ID
#define UPDATE_INTERVAL 5000      // Send data every 5 seconds

// ========================================

FirebaseData firebaseData;
FirebaseConfig config;
FirebaseAuth auth;

unsigned long lastUpdateTime = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize sensor pins
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Connect to WiFi
  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    return;
  }
  
  // Configure Firebase
  config.database_url = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("✓ Firebase initialized!");
}

void loop() {
  // Check if it's time to update
  if (millis() - lastUpdateTime >= UPDATE_INTERVAL) {
    lastUpdateTime = millis();
    
    // Read sensor
    float distanceCM = getDistance();
    
    // Calculate garbage fill level percentage
    float garbageLevelCM = BIN_HEIGHT_CM - distanceCM;
    int levelPercent = constrain((garbageLevelCM / BIN_HEIGHT_CM) * 100, 0, 100);
    
    Serial.print("Distance: ");
    Serial.print(distanceCM);
    Serial.print(" cm | Bin Fill Level: ");
    Serial.print(levelPercent);
    Serial.println("%");
    
    // Send to Firebase
    sendToFirebase(levelPercent, distanceCM);
  }
}

// Read distance from HC-SR04 sensor
float getDistance() {
  // Send trigger pulse
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  // Read echo time
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  
  // Calculate distance (speed of sound = 343 m/s)
  // Distance in cm = (time in microseconds * 343) / 20000
  float distance = (duration * 0.0343) / 2;
  
  // Return 0 if invalid reading
  if (distance <= 0 || distance > BIN_HEIGHT_CM + 10) {
    return 0;
  }
  
  return distance;
}

// Send data to Firebase
void sendToFirebase(int levelPercent, float distanceCM) {
  String path = "/dustbin_level/" + String(DEVICE_ID);
  
  // Create JSON object with data
  FirebaseJson json;
  json.set("current_level", levelPercent);
  json.set("distance_cm", distanceCM);
  json.set("last_updated", millis());
  json.set("device_id", DEVICE_ID);
  
  // Set in database
  if (Firebase.RTDB.setJSON(&firebaseData, path.c_str(), &json)) {
    Serial.println("✓ Data sent to Firebase");
  } else {
    Serial.print("✗ Firebase error: ");
    Serial.println(firebaseData.errorReason());
  }
}

/*
  TROUBLESHOOTING:
  
  1. Sensor reading 0 cm?
     - Check wiring: Trigger → GPIO4, Echo → GPIO5
     - Verify pins in Arduino IDE board settings
  
  2. Firebase connection fails?
     - Check WiFi credentials
     - Get new Database Secret from Firebase Console
     - Verify FIREBASE_HOST (ends with .firebaseio.com)
  
  3. Erratic readings?
     - Add capacitor (100µF) between sensor pins
     - Increase delay between readings (currently 5 seconds)
     - Verify sensor is 2-400 cm away from object
  
  4. Upload fails?
     - Select "ESP32 Dev Module" in Board Manager
     - Set Upload Speed to 115200
     - Install esp32 board from Arduino IDE
*/
