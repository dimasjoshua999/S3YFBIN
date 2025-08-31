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
# Configure CORS properly
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "allow_headers": ["Content-Type"],
        "methods": ["GET", "POST", "OPTIONS"]
    }
})

# Configure SocketIO with proper CORS and WebSocket settings
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    ping_timeout=10,
    ping_interval=5,
    always_connect=True,
    transports=['websocket']
)

camera = None
detection_thread = None
thread_running = False
client_connected = False

try:
    arduino = serial.Serial('COM7', 9600, timeout=1)
    time.sleep(2)  # wait for Arduino to initialize
    print("✅ Arduino connected")
except Exception as e:
    print("⚠️ Arduino connection failed:", e)
    arduino = None

@app.route('/')
def home():
    return jsonify({"message": "YOLO Flask server is running."})

def detect_objects():
    global camera, thread_running
    try:
        camera = cv2.VideoCapture(0)
        if not camera.isOpened():
            socketio.emit('server_message', {'type': 'error', 'message': 'Failed to open camera'})
            return

        model = YOLO("src/backend/best.pt")
        model.fuse()
        model.conf = 0.5
        detection_active = True

        while thread_running and detection_active:
            ret, frame = camera.read()
            if not ret:
                socketio.emit('server_message', {'type': 'error', 'message': 'Failed to read frame'})
                break

            # Process with YOLO
            results = model.track(frame, persist=True, device="cpu")[0]
            
            if results.boxes is not None and len(results.boxes.cls) > 0:
                cls_id = int(results.boxes.cls[0].item())
                confidence = float(results.boxes.conf[0].item())
                current_label = model.names.get(cls_id, "none").lower()

                # Only emit if confidence is above threshold
                if confidence > 0.5:
                    print(f"Detection: {current_label} ({confidence:.2f})")
                    socketio.emit('detection_event', {
                        'type': 'detection',
                        'label': current_label,
                        'confidence': round(confidence * 100, 2),
                        'timestamp': time.time()
                    })

                    # Send the final frame with detection
                    annotated_frame = results.plot()
                    _, buffer = cv2.imencode('.jpg', annotated_frame)
                    img_base64 = base64.b64encode(buffer).decode('utf-8')
                    socketio.emit('frame_update', {
                        'type': 'frame',
                        'image': f'data:image/jpeg;base64,{img_base64}'
                    })

                    # Stop detection after finding waste
                    detection_active = False
                    break

            # Send frame updates while searching
            annotated_frame = results.plot()
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            socketio.emit('frame_update', {
                'type': 'frame',
                'image': f'data:image/jpeg;base64,{img_base64}'
            })

            time.sleep(0.1)  # Small delay to prevent overwhelming the connection

    except Exception as e:
        print("Detection error:", str(e))
        socketio.emit('server_message', {'type': 'error', 'message': str(e)})

    finally:
        thread_running = False
        if camera and camera.isOpened():
            camera.release()

@socketio.on('start_detection')
def handle_start_detection():
    global thread_running, detection_thread
    print("Starting new detection")
    
    if not thread_running:
        thread_running = True
        detection_thread = threading.Thread(target=detect_objects)
        detection_thread.daemon = True
        detection_thread.start()
        emit('server_message', {'type': 'status', 'message': 'Starting new detection...'})

@socketio.on('connect')
def handle_connect():
    global thread_running, detection_thread
    print("Client connected")
    emit('handshake', {'status': 'connected', 'message': 'Connected to YOLO Flask server'})

    if not thread_running:
        thread_running = True
        detection_thread = threading.Thread(target=detect_objects)
        detection_thread.daemon = True
        detection_thread.start()
        print("Detection thread started")

@socketio.on('disconnect')
def handle_disconnect():
    global thread_running, client_connected
    print("Client disconnected.")
    client_connected = False
    thread_running = False

@socketio.on('STERILIZE')
def handle_sterilization():
    print("🧪 Sterilization triggered from frontend")
    if arduino and arduino.is_open:
        try:
            arduino.write(b'STERILIZE\n')
            emit('server_message', {'type': 'status', 'message': 'Sterilization Completed.'})
        except Exception as e:
            print("Arduino write failed:", e)
            emit('server_message', {'type': 'error', 'message': f'Sterilization failed: {str(e)}'})
    else:
        emit('server_message', {'type': 'error', 'message': 'Arduino not connected'})

@socketio.on('SANITIZE')
def handle_sanitization():
    print("Sanitization triggered from frontend")
    if arduino and arduino.is_open:
        try:
            arduino.write(b'SANITIZE\n')
            emit('server_message', {'type': 'status', 'message': 'Sanitization Completed.'})
        except Exception as e:
            print("Arduino write failed:", e)
            emit('server_message', {'type': 'error', 'message': f'Sanitization failed: {str(e)}'})
    else:
        emit('server_message', {'type': 'error', 'message': 'Arduino not connected'})

@socketio.on('ping')
def handle_ping():
    emit('pong')

if __name__ == '__main__':
    socketio.run(app, host='192.168.0.105', port=3000, debug=True, allow_unsafe_werkzeug=True)