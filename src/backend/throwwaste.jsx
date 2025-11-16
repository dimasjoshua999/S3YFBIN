import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const syringeLabel = "syringe";
const hazardous = ["gauze pad", "gauze", "gloves", "disposable-mask"];
const nonhazardous = ["bandage", "head-cap"];
const equipments = ["scissor", "stethoscope", "sphygmomanometer"];
const otherwaste = "cotton";

function ThrowWaste() {
  const [status, setStatus] = useState("Initializing...");
  const [statusType, setStatusType] = useState("normal");
  const [frameUrl, setFrameUrl] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [ultrasonicLevels, setUltrasonicLevels] = useState({
    syringe_pct: 0,
    hazardous_pct: 0,
    nonhazardous_pct: 0,
  });

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const resumeTimerRef = useRef(null);

  const autoThrowWaste = (type, pauseDuration) => {
    setIsPaused(true);
    setFrameUrl(""); // Clear camera immediately
    
    if (type === "syringe") socketRef.current?.emit("THROW_SYRINGE");
    else if (type === "hazardous") socketRef.current?.emit("THROW_HAZARDOUS");
    else if (type === "nonhazardous") socketRef.current?.emit("THROW_NONHAZARDOUS");
    
    // Server handles camera pause/resume automatically
    // Just wait for the duration then allow new detections
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, pauseDuration);
  };

  const autoSterilizeEquipment = () => {
    setIsPaused(true);
    setFrameUrl(""); // Clear camera immediately
    socketRef.current?.emit("STERILIZE_EQUIPMENTS");
    
    // Server handles camera pause/resume automatically
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 30000);
  };

  useEffect(() => {
    const socket = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatus("✅ Connected — Starting detection...");
      setStatusType("normal");
      socket.emit("subscribe_ultrasonic");
      socket.emit("start_detection"); // Auto-start when navigating to this page
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setStatus("❌ Disconnected. Attempting to reconnect...");
      setStatusType("error");
    });

    socket.on("frame_update", (data) => {
      if (data.image) setFrameUrl(data.image);
    });

    socket.on("server_message", (data) => {
      if (data.type === "status") {
        setStatus(data.message);
        setStatusType("normal");
      } else if (data.type === "error") {
        setStatus(`❌ ${data.message}`);
        setStatusType("error");
        setIsPaused(false); // Resume on error
      }
    });

    socket.on("ultrasonic_update", (data) => {
      setUltrasonicLevels({
        syringe_pct: data.syringe_pct ?? 0,
        hazardous_pct: data.hazardous_pct ?? 0,
        nonhazardous_pct: data.nonhazardous_pct ?? 0,
      });
    });

    socket.on("detection_event", (data) => {
      if (isPaused) return;
      
      const label = data.label ? data.label.trim().toLowerCase() : "none";
      setConfidence(data.confidence || 0);
      setLastDetection(new Date().toLocaleTimeString());

      if (label === "none") {
        setStatus("No waste detected. Please place waste in front of camera.");
      } else if (label === syringeLabel) {
        setStatus(`⚠️ Syringe detected (${data.confidence}% confidence)`);
        autoThrowWaste("syringe", 10000);
      } else if (hazardous.includes(label)) {
        setStatus(`🔴 Hazardous waste detected (${label})`);
        autoThrowWaste("hazardous", 11000);
      } else if (nonhazardous.includes(label)) {
        setStatus(`🟢 Non-hazardous waste detected (${label})`);
        autoThrowWaste("nonhazardous", 11000);
      } else if (equipments.includes(label)) {
        setStatus(`⚪ Equipment detected (${label})`);
        autoSterilizeEquipment();
      } else if (label === otherwaste) {
        setStatus(`🟡 Cotton detected → Hazardous Bin`);
        autoThrowWaste("hazardous", 11000);
      } else {
        setStatus(`⚪ Unrecognized waste detected (${label})`);
      }
    });

    return () => {
      socket.emit("unsubscribe_ultrasonic");
      socket.disconnect();
      // Capture current ref values before cleanup
      const timer = timerRef.current;
      const resumeTimer = resumeTimerRef.current;
      if (timer) clearTimeout(timer);
      if (resumeTimer) clearTimeout(resumeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getBinStatus = (pct) => {
    if (pct >= 100) return { text: "FULL", color: "text-red-600 font-extrabold animate-pulse" };
    if (pct >= 90) return { text: "ALMOST FULL", color: "text-orange-500 font-bold" };
    if (pct >= 60) return { text: "HALF FULL", color: "text-yellow-500" };
    return { text: `${pct}%`, color: "text-green-400" };
  };

  const syringeStatus = getBinStatus(ultrasonicLevels.syringe_pct);
  const hazardousStatus = getBinStatus(ultrasonicLevels.hazardous_pct);
  const nonhazardousStatus = getBinStatus(ultrasonicLevels.nonhazardous_pct);

  const statusColor = {
    normal: "text-white",
    error: "text-red-500 font-bold",
    warning: "text-red-400 font-extrabold animate-pulse",
  }[statusType];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 sm:px-6 md:px-10 text-center"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "scroll"
      }}
    >
      <div className="absolute top-4 right-4 text-xs sm:text-sm md:text-base">
        <div className={`flex items-center ${isConnected ? "text-green-400" : "text-red-400"}`}>
          <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-400" : "bg-red-400"}`}></div>
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
        S3YF <span className="text-blue-300">BIN</span>
      </h1>

      <h2 className="text-xl sm:text-2xl md:text-3xl mt-3 text-white">STERILIZATION | THROW</h2>

      <div className="text-center mt-4">
        <p className={`text-base sm:text-lg md:text-2xl font-bold ${statusColor}`}>{status}</p>
        {confidence > 0 && (
          <p className="text-sm sm:text-base mt-2 text-gray-200">
            Confidence: {confidence}% | Last Detection: {lastDetection}
          </p>
        )}
      </div>

      {frameUrl ? (
        <div className="relative mt-4 w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl">
          <img
            src={frameUrl}
            className="w-full border-2 border-blue-500 rounded-lg shadow-lg object-contain"
            alt="YOLO Frame"
          />
        </div>
      ) : (
        <div className="relative mt-4 w-full max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl">
          <div className="w-full h-64 bg-gray-800/50 border-2 border-blue-500 rounded-lg shadow-lg flex items-center justify-center">
            <p className="text-white text-sm sm:text-base">
              {isPaused 
                ? "Camera paused - Processing waste..." 
                : "Waiting for camera stream..."}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/30">
        <h3 className="text-lg font-bold text-white mb-3">BIN STATUS</h3>
        <div className="flex gap-6 text-sm sm:text-base">
          <div className="text-center">
            <p className="text-gray-300 mb-1">SYRINGE</p>
            <p className={syringeStatus.color}>{syringeStatus.text}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-300 mb-1">HAZARDOUS</p>
            <p className={hazardousStatus.color}>{hazardousStatus.text}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-300 mb-1">NON-HAZARDOUS</p>
            <p className={nonhazardousStatus.color}>{nonhazardousStatus.text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ThrowWaste;