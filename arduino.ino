#include <Servo.h>

// Ultrasonic Pins
#define TRIG_H 2
#define ECHO_H 3
#define TRIG_NH 4
#define ECHO_NH 5
#define TRIG_S 6
#define ECHO_S 7

// Servo + LED Pins
Servo servoHazardous;     // Servo 1 - hazardous
Servo servoNonHazardous;  // Servo 2 - non-hazardous

const int relay1 = 8;     // Conveyor LED
const int relay2 = 9;     // Equipment sterilization LED
const int pinHaz = 10;    // Servo 1 pin
const int pinNonHaz = 11; // Servo 2 pin

String incoming = "";
bool servo1Moved = false;
bool servo2Moved = false;

const float BIN_HEIGHT = 45;      // cm
const float FULL_DISTANCE = 10;   // bin near full threshold

// ---------- SETUP ----------
void setup() {
  Serial.begin(9600);
  Serial.setTimeout(200);

  // Ultrasonic pins
  pinMode(TRIG_H, OUTPUT); pinMode(ECHO_H, INPUT);
  pinMode(TRIG_NH, OUTPUT); pinMode(ECHO_NH, INPUT);
  pinMode(TRIG_S, OUTPUT); pinMode(ECHO_S, INPUT);

  // Relay pins
  pinMode(relay1, OUTPUT);
  pinMode(relay2, OUTPUT);
  digitalWrite(relay1, HIGH);   // OFF
  digitalWrite(relay2, HIGH);   // OFF

  // Servos start detached
  servoHazardous.detach();
  servoNonHazardous.detach();

  Serial.println("SYSTEM_READY");
}

// ---------- MAIN LOOP ----------
void loop() {
  // ======= ULTRASONIC BIN STATUS =======
  float distH = getStableDistance(TRIG_H, ECHO_H);
  float distNH = getStableDistance(TRIG_NH, ECHO_NH);
  float distS = getStableDistance(TRIG_S, ECHO_S);

  // Clamp to valid range
  if (distH > BIN_HEIGHT || distH < 0) distH = BIN_HEIGHT;
  if (distNH > BIN_HEIGHT || distNH < 0) distNH = BIN_HEIGHT;
  if (distS > BIN_HEIGHT || distS < 0) distS = BIN_HEIGHT;

  // ✅ One clean line for Flask to parse
  Serial.print(distH); Serial.print(" ");
  Serial.print(distNH); Serial.print(" ");
  Serial.println(distS);

  // ======= MANUAL SERIAL COMMANDS =======
  if (Serial.available() > 0) {
    incoming = Serial.readStringUntil('\n');
    incoming.trim();
    incoming.toUpperCase();

    servo1Moved = false;
    servo2Moved = false;

    if (incoming == "SYRINGE") {
      Serial.println("CMD_OK:SYRINGE");
      flashLED(relay1, 10000); // 10s conveyor light
      Serial.println("DONE:SYRINGE");

    } else if (incoming == "HAZARDOUS") {
      Serial.println("CMD_OK:HAZARDOUS");
      moveServo(servoHazardous, pinHaz);
      servo1Moved = true;
      flashLED(relay1, 10000);
      Serial.println("DONE:HAZARDOUS");

    } else if (incoming == "NONHAZARDOUS") {
      Serial.println("CMD_OK:NONHAZARDOUS");
      moveServo(servoNonHazardous, pinNonHaz);
      servo2Moved = true;
      flashLED(relay1, 10000);
      Serial.println("DONE:NONHAZARDOUS");

    } else if (incoming == "EQUIPMENT") {
      Serial.println("CMD_OK:EQUIPMENT");
      digitalWrite(relay2, LOW);    // LED ON
      delay(30000);                 // 30 sec
      digitalWrite(relay2, HIGH);   // LED OFF
      Serial.println("DONE:EQUIPMENT");

    } else {
      Serial.print("UNKNOWN_CMD: "); Serial.println(incoming);
    }

    // Return servos to start position
    if (servo1Moved || servo2Moved) returnServosToStart();

    delay(50);
  }

  delay(1000); // Prevent flooding serial
}

// ---------- FUNCTIONS ----------

// Single distance read
float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
  if (duration == 0) return BIN_HEIGHT;
  return duration * 0.034 / 2;
}

// Average of 3 readings (stabilized)
float getStableDistance(int trig, int echo) {
  float sum = 0; int count = 0;
  for (int i = 0; i < 3; i++) {
    float d = getDistance(trig, echo);
    if (d > 0 && d < BIN_HEIGHT + 10) { sum += d; count++; }
    delay(50);
  }
  if (count == 0) return BIN_HEIGHT;
  return sum / count;
}

void moveServo(Servo &s, int pin) {
  s.attach(pin);
  delay(10);
  s.write(30);
  delay(400);
  s.write(0);
  delay(300);
  s.detach();
}

void flashLED(int pin, int durationMs) {
  digitalWrite(pin, LOW);
  delay(durationMs);
  digitalWrite(pin, HIGH);
}

void returnServosToStart() {
  if (servo1Moved) {
    servoHazardous.attach(pinHaz);
    delay(10);
    servoHazardous.write(0);
    delay(300);
    servoHazardous.detach();
  }
  if (servo2Moved) {
    servoNonHazardous.attach(pinNonHaz);
    delay(10);
    servoNonHazardous.write(0);
    delay(300);
    servoNonHazardous.detach();
  }
  Serial.println("✅ Servos returned to start position");
}
