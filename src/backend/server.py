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
socket_lock = threading.Lock()  # Add lock for thread safety

# --- Arduino Setup ---
try:
    arduino = serial.Serial('COM13', 9600, timeout=1)
    time.sleep(2)
    print("Arduino connected on COM13")
except Exception as e:
    print("Arduino connection failed:", e)
    arduino = None


@app.route('/')
def home():
    return jsonify({"message": "YOLO Flask server is running on port 5000."})


# --- Safe Emit with better error handling ---
def safe_emit(event, data):
    global client_connected, socketio, socket_lock
    
    with socket_lock:
        if not client_connected:
            print(f"Skipped emit ({event}): no active client.")
            return False
            
        try:
            socketio.emit(event, data)
            return True
        except OSError as e:
            if e.errno == 10038:
                print(f"Socket closed during emit ({event}), marking client disconnected.")
                client_connected = False
            else:
                print(f"OSError while emitting {event}: {e}")
            return False
        except Exception as e:
            print(f"Emit failed for {event}: {e}")
            return False


def detect_objects():
    global camera, thread_running, client_connected

    try:
        camera = cv2.VideoCapture(1)
        if not camera.isOpened():
            safe_emit('server_message', {'type': 'error', 'message': 'Failed to open camera'})
            return

        model = YOLO("src/backend/new.pt")
        model.fuse()
        model.conf = 0.5

        while thread_running and client_connected:
            if not client_connected:
                print("No client connected, stopping detection.")
                break

            ret, frame = camera.read()
            if not ret:
                time.sleep(0.1)
                continue

            # Mirror frame (natural camera view)
            frame = cv2.flip(frame, 1)
            results = model.track(frame, persist=True, device="cpu")[0]

            if results.boxes is not None and len(results.boxes.cls) > 0:
                num_detections = len(results.boxes.cls)

                # --- Multiple object warning - stop detection ---
                if num_detections > 1:
                    if not safe_emit("server_message", {
                        "type": "warning",
                        "color": "red",
                        "message": "Please throw or place wastes/equipment one by one."
                    }):
                        break

                    annotated_frame = results.plot()
                    _, buffer = cv2.imencode('.jpg', annotated_frame)
                    img_base64 = base64.b64encode(buffer).decode('utf-8')
                    safe_emit('frame_update', {'image': f'data:image/jpeg;base64,{img_base64}'})

                    thread_running = False
                    print("Multiple objects detected - stopping detection")
                    break

                # --- Single detection ---
                cls_id = int(results.boxes.cls[0].item())
                confidence = float(results.boxes.conf[0].item())
                label = model.names.get(cls_id, "unknown").lower()

                if confidence > 0.5:
                    print(f"Detected: {label} ({confidence:.2f})")

                    # Send detection event instantly
                    if not safe_emit('detection_event', {
                        'label': label,
                        'confidence': round(confidence * 100, 2),
                        'timestamp': time.time()
                    }):
                        break

                    safe_emit("server_message", {
                        "type": "status",
                        "color": "white",
                        "message": f"{label.upper()} detected successfully."
                    })

                    # Stop detection after first valid detection
                    thread_running = False
                    break

            # --- Stream frame to client ---
            if client_connected:
                try:
                    annotated_frame = results.plot()
                    _, buffer = cv2.imencode('.jpg', annotated_frame)
                    img_base64 = base64.b64encode(buffer).decode('utf-8')
                    if not safe_emit('frame_update', {'image': f'data:image/jpeg;base64,{img_base64}'}):
                        break
                except Exception as e:
                    print(f"Frame encoding error: {e}")

            time.sleep(0.1)

    except Exception as e:
        safe_emit('server_message', {'type': 'error', 'message': str(e)})
        print("detect_objects error:", e)

    finally:
        if camera and camera.isOpened():
            camera.release()
            camera = None
        thread_running = False
        print("Camera released, detection thread stopped.")


# --- Socket Events ---
@socketio.on('connect')
def handle_connect():
    global thread_running, detection_thread, client_connected
    
    with socket_lock:
        client_connected = True
    
    print("Client connected")
    emit('handshake', {'message': 'Connected to YOLO Flask server'})
    
    if not thread_running:
        thread_running = True
        detection_thread = threading.Thread(target=detect_objects)
        detection_thread.daemon = True
        detection_thread.start()


@socketio.on('disconnect')
def handle_disconnect():
    global thread_running, client_connected, camera
    print("Client disconnected, cleaning up.")
    
    with socket_lock:
        client_connected = False
    
    thread_running = False
    
    # Wait for detection thread to finish
    if detection_thread and detection_thread.is_alive():
        detection_thread.join(timeout=2)
    
    try:
        if camera and camera.isOpened():
            camera.release()
            print("Camera released on disconnect.")
    except Exception as e:
        print(f"Camera cleanup failed: {e}")


@socketio.on('start_detection')
def handle_start_detection():
    global thread_running, detection_thread
    
    if not client_connected:
        print("Cannot start detection: no client connected")
        return
    
    print("Starting new detection...")
    if not thread_running:
        thread_running = True
        detection_thread = threading.Thread(target=detect_objects)
        detection_thread.daemon = True
        detection_thread.start()
    safe_emit('server_message', {'type': 'status', 'color': 'white', 'message': 'Starting detection...'})


# --- Arduino Commands (with completion callback in separate thread) ---
def send_to_arduino_async(command, wait_time=3):
    """Handle Arduino command and prompt in separate thread to avoid blocking"""
    global client_connected
    
    if arduino and arduino.is_open:
        try:
            arduino.write((command + "\n").encode())
            arduino.flush()
            print(f"Sent to Arduino: {command}")
            safe_emit('server_message', {'type': 'status', 'color': 'white', 'message': f'{command} command sent.'})
            
            # Wait for action to complete
            time.sleep(wait_time)
            
            # Check if client still connected before sending prompt
            if client_connected:
                safe_emit("choice_prompt", {
                    "message": "Action completed. Continue detection or end it?",
                    "options": ["Continue", "Stop"]
                })
        except Exception as e:
            print(f"Arduino write failed: {e}")
            safe_emit('server_message', {'type': 'error', 'message': f'Failed to send {command}: {str(e)}'})
    else:
        safe_emit('server_message', {'type': 'error', 'message': 'Arduino not connected'})


@socketio.on('THROW_HAZARDOUS')
def handle_hazardous():
    print("Hazardous waste command received")
    threading.Thread(target=send_to_arduino_async, args=("HAZARDOUS", 3), daemon=True).start()


@socketio.on('THROW_NONHAZARDOUS')
def handle_nonhazardous():
    print("Non-hazardous waste command received")
    threading.Thread(target=send_to_arduino_async, args=("NONHAZARDOUS", 3), daemon=True).start()


@socketio.on('THROW_SYRINGE')
def handle_syringe():
    print("Syringe waste command received")
    threading.Thread(target=send_to_arduino_async, args=("SYRINGE", 3), daemon=True).start()


@socketio.on('STERILIZE_EQUIPMENTS')
def handle_equipments():
    print("Equipment sterilization command received")
    threading.Thread(target=send_to_arduino_async, args=("EQUIPMENT", 20), daemon=True).start()


# --- User Choice Handler ---
@socketio.on('user_choice')
def handle_user_choice(data):
    global thread_running, detection_thread
    
    if not client_connected:
        print("Cannot process user choice: no client connected")
        return
    
    choice = data.get("choice", "").lower()
    if choice == "continue":
        print("User chose to continue detection.")
        if not thread_running:
            thread_running = True
            detection_thread = threading.Thread(target=detect_objects)
            detection_thread.daemon = True
            detection_thread.start()
        safe_emit('server_message', {'type': 'status', 'color': 'white', 'message': 'Continuing detection...'})
    else:
        print("User chose to stop detection.")
        thread_running = False
        safe_emit('server_message', {'type': 'status', 'color': 'white', 'message': 'Detection ended.'})


@socketio.on('ping')
def handle_ping():
    emit('pong')


if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5000")
    socketio.run(app, host='127.0.0.1', port=5000, debug=True, allow_unsafe_werkzeug=True)