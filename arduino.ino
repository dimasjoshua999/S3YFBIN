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
const int pinHaz = 10;     // Servo 1 pin
const int pinNonHaz = 11;  // Servo 2 pin

String incoming = "";
bool servo1Moved = false;
bool servo2Moved = false;

const float BIN_HEIGHT = 45.0;      // cm
const float FULL_DISTANCE = 10.0;   // bin near full threshold

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

void loop() {
  // ======= ULTRASONIC BIN STATUS (ALWAYS RUNNING) =======
  float distH = getDistance(TRIG_H, ECHO_H);
  float distNH = getDistance(TRIG_NH, ECHO_NH);
  float distS = getDistance(TRIG_S, ECHO_S);

  // Clamp invalid readings
  if(distH > BIN_HEIGHT || distH < 0) distH = BIN_HEIGHT;
  if(distNH > BIN_HEIGHT || distNH < 0) distNH = BIN_HEIGHT;
  if(distS > BIN_HEIGHT || distS < 0) distS = BIN_HEIGHT;

  // 📊 CONSISTENT FORMAT FOR PYTHON PARSING
  Serial.print("Hazardous: ");
  Serial.print(distH, 1);
  Serial.print(" cm, Non-Hazardous: ");
  Serial.print(distNH, 1);
  Serial.print(" cm, Syringe: ");
  Serial.print(distS, 1);
  Serial.println(" cm");

  // ======= MANUAL SERIAL COMMANDS (FOR YOLO ACTIONS) =======
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
      flashLED(relay1, 10000); // 10s conveyor light
      Serial.println("DONE:HAZARDOUS");

    } else if (incoming == "NONHAZARDOUS") {
      Serial.println("CMD_OK:NONHAZARDOUS");
      moveServo(servoNonHazardous, pinNonHaz);
      servo2Moved = true;
      flashLED(relay1, 10000); // 10s conveyor light
      Serial.println("DONE:NONHAZARDOUS");

    } else if (incoming == "EQUIPMENT") {
      Serial.println("CMD_OK:EQUIPMENT");
      digitalWrite(relay2, LOW);    // LED ON
      delay(30000);                  // 30 sec
      digitalWrite(relay2, HIGH);   // LED OFF
      Serial.println("DONE:EQUIPMENT");

    } else {
      Serial.print("UNKNOWN_CMD: "); 
      Serial.println(incoming);
    }

    // Return servos after action
    if (servo1Moved || servo2Moved) {
      returnServosToStart();
    }
  }

  delay(1000);  // 1 second delay between readings
}

// ======= FUNCTIONS =======
float getDistance(int trigPin, int echoPin){
  digitalWrite(trigPin, LOW); 
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); 
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  if(duration == 0) return BIN_HEIGHT;
  return duration * 0.034 / 2;
}

void moveServo(Servo &s, int pin){
  s.attach(pin);
  delay(10);
  s.write(30);       // Move to action position
  delay(400);
  s.write(0);        // Return to 0°
  delay(300);
  s.detach();
}

void flashLED(int pin, int durationMs){
  digitalWrite(pin, LOW);   // LED ON
  delay(durationMs);
  digitalWrite(pin, HIGH);  // LED OFF
}

void returnServosToStart(){
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
  Serial.println("Servos returned to start position");
}