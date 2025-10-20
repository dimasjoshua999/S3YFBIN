from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import cv2
import threading
import time
import base64
from ultralytics import YOLO
import serial

app = Flask(__name__)

# -----------------------------------
# ⚙️  CONFIGURATIONS
# -----------------------------------
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    ping_timeout=30,
    ping_interval=10,
    transports=['websocket']
)

camera = None
detection_thread = None
thread_running = False

# -----------------------------------
# 🧠  ARDUINO CONNECTION
# -----------------------------------
try:
    arduino = serial.Serial('COM13', 9600, timeout=1)
    time.sleep(2)
    print("✅ Arduino connected on COM13")
except Exception as e:
    print("⚠️ Arduino connection failed:", e)
    arduino = None

# -----------------------------------
# 🧩 ROUTES
# -----------------------------------
@app.route('/')
def home():
    return jsonify({"message": "YOLO Flask server is running on port 5000."})

# -----------------------------------
# 🧠 YOLO DETECTION THREAD
# -----------------------------------
def detect_objects():
    global camera, thread_running
    try:
        camera = cv2.VideoCapture(1)
        if not camera.isOpened():
            socketio.emit('server_message', {'type': 'error', 'message': 'Failed to open camera'})
            return

        model = YOLO("src/backend/YOLO2.pt")
        model.fuse()
        model.conf = 0.5

        while thread_running:
            ret, frame = camera.read()
            if not ret:
                break

            results = model.track(frame, persist=True, device="cpu")[0]

            if results.boxes is not None and len(results.boxes.cls) > 0:
                cls_id = int(results.boxes.cls[0].item())
                confidence = float(results.boxes.conf[0].item())
                label = model.names.get(cls_id, "none").lower()

                if confidence > 0.5:
                    print(f"Detected: {label} ({confidence:.2f})")
                    socketio.emit('detection_event', {
                        'label': label,
                        'confidence': round(confidence * 100, 2),
                        'timestamp': time.time()
                    })

                    annotated_frame = results.plot()
                    _, buffer = cv2.imencode('.jpg', annotated_frame)
                    img_base64 = base64.b64encode(buffer).decode('utf-8')
                    socketio.emit('frame_update', {'image': f'data:image/jpeg;base64,{img_base64}'})
                    break

            # Stream frame even without detection
            annotated_frame = results.plot()
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            socketio.emit('frame_update', {'image': f'data:image/jpeg;base64,{img_base64}'})
            time.sleep(0.1)

    except Exception as e:
        socketio.emit('server_message', {'type': 'error', 'message': str(e)})
    finally:
        thread_running = False
        if camera and camera.isOpened():
            camera.release()

# -----------------------------------
# 🧠 SOCKET EVENTS
# -----------------------------------
@socketio.on('connect')
def handle_connect():
    global thread_running, detection_thread
    print("🟢 Client connected")
    emit('handshake', {'message': 'Connected to YOLO Flask server'})
    
    if not thread_running:
        thread_running = True
        detection_thread = threading.Thread(target=detect_objects)
        detection_thread.daemon = True
        detection_thread.start()

@socketio.on('disconnect')
def handle_disconnect():
    global thread_running
    print("🔴 Client disconnected")
    thread_running = False

@socketio.on('start_detection')
def handle_start_detection():
    global thread_running, detection_thread
    print("🔍 Starting new detection...")
    
    if not thread_running:
        thread_running = True
        detection_thread = threading.Thread(target=detect_objects)
        detection_thread.daemon = True
        detection_thread.start()
    
    emit('server_message', {'type': 'status', 'message': 'Starting detection...'})

# -----------------------------------
# ⚙️ FRONTEND → ARDUINO COMMANDS
# -----------------------------------
def send_to_arduino(command):
    if arduino and arduino.is_open:
        try:
            arduino.write((command + "\n").encode())
            arduino.flush()
            print(f"✅ Sent to Arduino: {command}")
            emit('server_message', {'type': 'status', 'message': f'{command} command sent.'})
        except Exception as e:
            print(f"❌ Arduino write failed: {e}")
            emit('server_message', {'type': 'error', 'message': f'Failed to send {command}: {str(e)}'})
    else:
        emit('server_message', {'type': 'error', 'message': 'Arduino not connected'})

@socketio.on('THROW_HAZARDOUS')
def handle_hazardous():
    print("🔴 Hazardous waste command received")
    send_to_arduino("HAZARDOUS")

@socketio.on('THROW_NONHAZARDOUS')
def handle_nonhazardous():
    print("🟢 Non-hazardous waste command received")
    send_to_arduino("NONHAZARDOUS")

@socketio.on('THROW_SYRINGE')
def handle_syringe():
    print("🟠 Syringe waste command received")
    send_to_arduino("SYRINGE")

@socketio.on('STERILIZE_EQUIPMENTS')
def handle_equipments():
    print("🔵 Equipment sterilization command received")
    send_to_arduino("EQUIPMENT")

@socketio.on('ping')
def handle_ping():
    emit('pong')

# -----------------------------------
# 🚀 RUN SERVER - Changed to port 5000
# -----------------------------------
if __name__ == '__main__':
    # Flask backend runs on port 5000, React will run on port 3000
    print("🚀 Starting Flask server on http://localhost:5000")
    socketio.run(app, host='127.0.0.1', port=5000, debug=True, allow_unsafe_werkzeug=True)