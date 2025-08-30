from ultralytics import YOLO
import cv2

model = YOLO("src/backend/best.pt") 
CONFIDENCE_THRESHOLD = 0.5  # Set confidence threshold

cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    results = model(frame)

    for result in results:
        for box in result.boxes:
            conf = box.conf[0].item() 
            if conf < CONFIDENCE_THRESHOLD:
                continue  

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls = int(box.cls[0])

            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 255), 2)
            cv2.putText(frame, f"{model.names[cls]} {conf:.2f}", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 255), 2)

    cv2.imshow("YOLO Webcam", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()