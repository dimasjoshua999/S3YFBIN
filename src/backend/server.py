from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import cv2
import threading
import time
import base64
from ultralytics import YOLO
import serial
import os

app = Flask(__name__)
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
client_connected = False
socket_lock = threading.Lock()

try:
    arduino = serial.Serial('COM13', 9600, timeout=1)
    time.sleep(2)
    print("Arduino connected on COM13")
except:
    print("Arduino connection failed")
    arduino = None

ultrasonic_thread = None
ultrasonic_running = False
ultrasonic_lock = threading.Lock()

BIN_HEIGHT_CM = 45.0
MIN_FULL_CM = 5.0

def safe_emit(event, data):
    try:
        if not socketio.server.manager.rooms.get("/", {}):
            return
        socketio.emit(event, data)
    except:
        pass

@app.route('/')
def home():
    return jsonify({"message": "YOLO Flask server running"})

def detect_objects():
    global camera, thread_running
    try:
        camera = cv2.VideoCapture(0)
        if not camera.isOpened():
            safe_emit('server_message', {'type': 'error', 'message': 'Camera error'})
            return

        model = YOLO("src/backend/waste.pt")
        try: model.fuse()
        except: pass
        model.conf = 0.5

        while thread_running:
            ret, frame = camera.read()
            if not ret:
                time.sleep(0.1)
                continue

            frame = cv2.flip(frame, 1)
            try:
                results = model.track(frame, persist=True, device="cpu")[0]
            except:
                time.sleep(0.1)
                continue

            if results.boxes is not None and len(results.boxes.cls) > 0:
                num_detections = len(results.boxes.cls)

                if num_detections > 1:
                    safe_emit("server_message", {
                        "type": "warning",
                        "color": "red",
                        "message": "Please throw one item at a time."
                    })

                    try:
                        annotated_frame = results.plot()
                        _, buffer = cv2.imencode('.jpg', annotated_frame)
                        img = base64.b64encode(buffer).decode('utf-8')
                        safe_emit('frame_update', {'image': f'data:image/jpeg;base64,{img}'})
                    except:
                        pass

                    thread_running = False
                    break

                try:
                    cid = int(results.boxes.cls[0].item())
                    conf = float(results.boxes.conf[0].item())
                    label = model.names.get(cid, "unknown").lower()
                except:
                    continue

                if conf > 0.5:
                    safe_emit('detection_event', {
                        'label': label,
                        'confidence': round(conf * 100, 2),
                        'timestamp': time.time()
                    })
                    safe_emit("server_message", {
                        "type": "status",
                        "color": "white",
                        "message": f"{label.upper()} detected."
                    })
                    thread_running = False
                    break

            try:
                annotated_frame = results.plot()
                _, buffer = cv2.imencode('.jpg', annotated_frame)
                img = base64.b64encode(buffer).decode('utf-8')
                safe_emit('frame_update', {'image': f'data:image/jpeg;base64,{img}'})
            except:
                pass

            time.sleep(0.1)

    finally:
        if camera and camera.isOpened():
            camera.release()
        thread_running = False

def parse_arduino_line(line):
    out = {'hazardous': None, 'nonhazardous': None, 'syringe': None}
    try:
        text = line.decode(errors='ignore') if isinstance(line, bytes) else str(line)
        tokens = text.replace(',', ' ').split()
        nums = []
        for tok in tokens:
            tok = tok.lower().replace('cm', '')
            try: nums.append(float(tok))
            except: pass
        if len(nums) >= 3:
            out['hazardous'], out['nonhazardous'], out['syringe'] = nums[:3]
    except:
        pass
    return out

def distance_to_percentage(d):
    if d is None: return None
    if d <= MIN_FULL_CM: return 100.0
    if d >= BIN_HEIGHT_CM: return 0.0
    pct = (1 - ((d - MIN_FULL_CM) / (BIN_HEIGHT_CM - MIN_FULL_CM))) * 100
    return round(max(0, min(100, pct)), 1)

def ultrasonic_loop():
    global ultrasonic_running
    if not arduino:
        safe_emit('server_message', {'type': 'error', 'message': 'Arduino missing'})
        return
    while True:
        with ultrasonic_lock:
            if not ultrasonic_running:
                break
        try:
            line = arduino.readline()
            if not line:
                time.sleep(0.2)
                continue

            p = parse_arduino_line(line)
            hz, nh, s = map(distance_to_percentage, [p['hazardous'], p['nonhazardous'], p['syringe']])

            payload = {
                'hazardous_cm': p['hazardous'],
                'nonhazardous_cm': p['nonhazardous'],
                'syringe_cm': p['syringe'],
                'hazardous_pct': hz,
                'nonhazardous_pct': nh,
                'syringe_pct': s,
                'timestamp': time.time()
            }
            safe_emit('ultrasonic_update', payload)
        except:
            time.sleep(0.5)

@socketio.on('connect')
def handle_connect():
    global client_connected
    with socket_lock: client_connected = True
    emit('handshake', {'message': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    global thread_running, client_connected, ultrasonic_running
    with socket_lock: client_connected = False
    thread_running = False
    with ultrasonic_lock: ultrasonic_running = False
    if camera and camera.isOpened(): camera.release()

@socketio.on('start_detection')
def handle_start_detection():
    global thread_running, detection_thread
    if not thread_running:
        thread_running = True
        detection_thread = threading.Thread(target=detect_objects, daemon=True)
        detection_thread.start()
    safe_emit('server_message', {'type': 'status', 'color': 'white', 'message': 'Starting detection...'})

@socketio.on('subscribe_ultrasonic')
def handle_subscribe_ultrasonic():
    global ultrasonic_running, ultrasonic_thread
    with ultrasonic_lock:
        if ultrasonic_running: return
        ultrasonic_running = True
        ultrasonic_thread = threading.Thread(target=ultrasonic_loop, daemon=True)
        ultrasonic_thread.start()

@socketio.on('unsubscribe_ultrasonic')
def handle_unsubscribe_ultrasonic():
    global ultrasonic_running
    with ultrasonic_lock: ultrasonic_running = False

def send_to_arduino(command, wait=3):
    if arduino and arduino.is_open:
        try:
            arduino.write((command+"\n").encode())
            arduino.flush()
            time.sleep(wait)
            if client_connected:
                safe_emit("choice_prompt", {"message": "Completed", "options": ["Continue", "Stop"]})
        except:
            safe_emit('server_message', {'type': 'error', 'message': f'Failed {command}'})
    else:
        safe_emit('server_message', {'type': 'error', 'message': 'Arduino missing'})

@socketio.on('THROW_HAZARDOUS')
def handle_hazardous(): threading.Thread(target=send_to_arduino, args=("HAZARDOUS",3), daemon=True).start()

@socketio.on('THROW_NONHAZARDOUS')
def handle_nonhazardous(): threading.Thread(target=send_to_arduino, args=("NONHAZARDOUS",3), daemon=True).start()

@socketio.on('THROW_SYRINGE')
def handle_syringe(): threading.Thread(target=send_to_arduino, args=("SYRINGE",3), daemon=True).start()

@socketio.on('STERILIZE_EQUIPMENTS')
def handle_equipment(): threading.Thread(target=send_to_arduino, args=("EQUIPMENT",20), daemon=True).start()

@socketio.on('user_choice')
def handle_choice(d):
    global thread_running, detection_thread
    if not client_connected: return
    if d.get("choice","").lower() == "continue":
        if not thread_running:
            thread_running = True
            detection_thread = threading.Thread(target=detect_objects, daemon=True)
            detection_thread.start()
    else:
        thread_running = False

@socketio.on('ping')
def handle_ping(): emit('pong')

if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=5000, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
