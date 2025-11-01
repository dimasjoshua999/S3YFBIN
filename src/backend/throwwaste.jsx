import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const syringeLabel = "syringe";
const hazardous = ["gauze pad", "gauze", "gloves", "disposable-mask"];
const nonhazardous = ["bandage", "head-cap"];
const equipments = ["scissor", "stethoscope", "sphygmomanometer"];
const otherwaste = "cotton";

function ThrowWaste() {
  const [status, setStatus] = useState("Initializing...");
  const [statusType, setStatusType] = useState("normal");
  const [wasteType, setWasteType] = useState(null);
  const [frameUrl, setFrameUrl] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSterilizingEquipments, setIsSterilizingEquipments] = useState(false);
  const [showCottonPrompt, setShowCottonPrompt] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [binFullAlert, setBinFullAlert] = useState("");

  const navigate = useNavigate();
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatus("✅ Connected — Waiting for detection...");
      setStatusType("normal");
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
      } else if (data.type === "warning") {
        setStatus(`⚠️ ${data.message}`);
        setStatusType("warning");
        setShowWarningModal(true);
        setIsDetecting(false);
      }
    });

    socket.on("bin_alert", (data) => {
      setBinFullAlert(`⚠️ ${data.bin} bin is almost full!`);
      setStatusType("warning");
    });

    socket.on("detection_event", (data) => {
      const label = data.label ? data.label.trim().toLowerCase() : "none";
      setConfidence(data.confidence || 0);
      setLastDetection(new Date().toLocaleTimeString());
      setIsDetecting(false);

      if (label === "none") {
        setWasteType(null);
        setStatus("No waste detected. Please place waste in front of camera.");
      } else if (label === syringeLabel) {
        setWasteType("syringe");
        setStatus(`⚠️ Syringe detected (${data.confidence}% confidence)`);
      } else if (hazardous.includes(label)) {
        setWasteType("hazardous");
        setStatus(`🔴 Hazardous waste detected (${label})`);
      } else if (nonhazardous.includes(label)) {
        setWasteType("nonhazardous");
        setStatus(`🟢 Non-hazardous waste detected (${label})`);
      } else if (equipments.includes(label)) {
        setWasteType("equipment");
        setStatus(`⚪ Equipment detected (${label})`);
      } else if (label === otherwaste) {
        setShowCottonPrompt(true);
        setStatus(`🟡 Cotton detected (${data.confidence}% confidence)`);
      } else {
        setWasteType("other");
        setStatus(`⚪ Unrecognized waste detected (${label})`);
      }
    });

    socket.on("choice_prompt", () => {
      setShowOptions(true);
    });

    return () => {
      socket.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAction = (action) => {
    if (!socketRef.current) return;

    if (action === "STERILIZE EQUIPMENTS") {
      if (isSterilizingEquipments) return;
      setIsSterilizingEquipments(true);
      setStatus("🧼 Sterilizing equipments...");
      socketRef.current.emit("STERILIZE_EQUIPMENTS");

      timerRef.current = setTimeout(() => {
        setIsSterilizingEquipments(false);
        setStatus("✅ Equipments sterilized successfully.");
        setShowOptions(true);
      }, 20000);
      return;
    }

    if (action === "Throwing Waste") {
      setStatus("🚮 Throwing waste...");
      if (wasteType === "syringe") socketRef.current.emit("THROW_SYRINGE");
      else if (wasteType === "hazardous") socketRef.current.emit("THROW_HAZARDOUS");
      else if (wasteType === "nonhazardous") socketRef.current.emit("THROW_NONHAZARDOUS");
      else if (wasteType === "equipment") socketRef.current.emit("STERILIZE_EQUIPMENTS");

      timerRef.current = setTimeout(() => {
        setStatus("✅ Waste successfully thrown.");
        setShowOptions(true);
      }, 3000);
    }
  };

  const startNewDetection = () => {
    if (socketRef.current && !isDetecting) {
      setWasteType(null);
      setStatus("Starting new detection...");
      setIsDetecting(true);
      setShowOptions(false);
      socketRef.current.emit("start_detection");
    }
  };

  const handleEndDetection = () => {
    socketRef.current?.emit("end_detection");
    setShowOptions(false);
    setWasteType(null);
    setStatus("🛑 Detection Ended.");
    setIsDetecting(false);
  };

  const handleContinueDetection = () => {
    setShowOptions(false);
    setShowWarningModal(false);
    setWasteType(null);
    setStatus("Continuing detection...");
    startNewDetection();
  };

  const handleCottonChoice = (choice) => {
    setShowCottonPrompt(false);
    if (choice === "used") {
      setWasteType("hazardous");
      setStatus("🩸 Used Cotton → Hazardous Bin");
    } else {
      setWasteType("nonhazardous");
      setStatus("🧻 Unused Cotton → Non-Hazardous Bin");
    }
  };

  const statusColor = {
    normal: "text-white",
    error: "text-red-500 font-bold",
    warning: "text-red-400 font-extrabold animate-pulse",
  }[statusType];

  const getButtonColor = () => {
    if (!wasteType) return "bg-gray-500 cursor-not-allowed";
    if (wasteType === "syringe") return "bg-orange-600 hover:bg-orange-700";
    if (wasteType === "nonhazardous") return "bg-green-600 hover:bg-green-700";
    if (wasteType === "hazardous") return "bg-red-600 hover:bg-red-700";
    if (wasteType === "equipment") return "bg-blue-500 hover:bg-blue-600";
    return "bg-yellow-500 hover:bg-yellow-600";
  };

  const getButtonText = () => {
    if (!wasteType) return "Waiting for Detection...";
    if (wasteType === "syringe") return "THROW SYRINGE";
    if (wasteType === "nonhazardous") return "THROW NON-HAZARDOUS WASTE";
    if (wasteType === "hazardous") return "THROW HAZARDOUS WASTE";
    if (wasteType === "equipment") return "STERILIZE EQUIPMENTS";
    return "THROW OTHER WASTE";
  };

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
      {binFullAlert && (
        <p className="text-red-500 font-extrabold text-sm sm:text-base mb-2 animate-pulse">
          {binFullAlert}
        </p>
      )}

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
        <p className="text-sm sm:text-base mt-4 text-white">Waiting for camera stream...</p>
      )}

      {!isDetecting && wasteType && (
        <button
          onClick={() =>
            handleAction(wasteType === "equipment" ? "STERILIZE EQUIPMENTS" : "Throwing Waste")
          }
          className={`${getButtonColor()} text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105 text-sm sm:text-base`}
        >
          {getButtonText()}
        </button>
      )}

      {!isDetecting && !wasteType && !showWarningModal && !showOptions && (
        <button
          onClick={startNewDetection}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 sm:py-3 px-6 sm:px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105 text-sm sm:text-base"
        >
          START NEW DETECTION
        </button>
      )}

      <motion.button
        className="mt-10 bg-white/20 backdrop-blur-md px-6 sm:px-8 py-2 sm:py-3 text-white font-bold rounded-full border border-white/40 hover:bg-white/30 transition-all shadow-md text-sm sm:text-base"
        whileHover={{ scale: 1.1 }}
        onClick={() => navigate("/dashboard")}
      >
        BACK
      </motion.button>

      {(showWarningModal || showOptions || showCottonPrompt) && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 px-4">
          <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl text-center text-black w-full max-w-xs sm:max-w-sm border-2 border-gray-300">
            {showWarningModal && (
              <>
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-red-600">⚠️ Multiple Wastes Detected</h3>
                <p className="mb-4 text-red-500 font-semibold text-sm sm:text-base">
                  Please throw waste or put equipment one by one.
                </p>
                <button
                  onClick={handleContinueDetection}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 sm:px-6 rounded-full text-sm sm:text-base"
                >
                  Continue Detection
                </button>
              </>
            )}

            {showOptions && (
              <>
                <h3 className="text-lg sm:text-xl font-bold mb-4">Action Complete</h3>
                <p className="mb-6 text-sm sm:text-base">Do you want to end detection or continue?</p>
                <div className="flex justify-center gap-3 sm:gap-4">
                  <button
                    onClick={handleEndDetection}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 sm:px-6 rounded-full text-sm sm:text-base"
                  >
                    End
                  </button>
                  <button
                    onClick={handleContinueDetection}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 sm:px-6 rounded-full text-sm sm:text-base"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {showCottonPrompt && (
              <>
                <h3 className="text-lg sm:text-xl font-bold mb-4">Cotton Detected</h3>
                <p className="mb-6 text-sm sm:text-base">Is the cotton used or unused?</p>
                <div className="flex justify-center gap-3 sm:gap-4">
                  <button
                    onClick={() => handleCottonChoice("used")}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 sm:px-6 rounded-full text-sm sm:text-base"
                  >
                    Used (Hazardous)
                  </button>
                  <button
                    onClick={() => handleCottonChoice("unused")}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 sm:px-6 rounded-full text-sm sm:text-base"
                  >
                    Unused (Non-Hazardous)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThrowWaste;
