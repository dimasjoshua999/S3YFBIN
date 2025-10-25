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
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setStatus("✅ Connected — Waiting for detection...");
      setStatusType("normal");
      setIsDetecting(true);
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

    // Listen for backend choice prompt after action completion
    socket.on("choice_prompt", (data) => {
      setShowOptions(true);
    });

    return () => {
      socket.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Actions
  const handleAction = (action) => {
    if (!socketRef.current) return;

    if (action === "STERILIZE EQUIPMENTS") {
      if (isSterilizingEquipments) return;
      setIsSterilizingEquipments(true);
      setStatus("🧼 Sterilizing equipments...");
      socketRef.current.emit("STERILIZE_EQUIPMENTS");
      
      // Frontend timer for UI feedback
      // Backend will send choice prompt after completion
      timerRef.current = setTimeout(() => {
        setIsSterilizingEquipments(false);
        setStatus("✅ Equipments sterilized successfully.");
      }, 20000);
      return;
    }

    if (action === "Throwing Waste") {
      setStatus("🚮 Throwing waste...");
      if (wasteType === "syringe") socketRef.current.emit("THROW_SYRINGE");
      else if (wasteType === "hazardous") socketRef.current.emit("THROW_HAZARDOUS");
      else if (wasteType === "nonhazardous") socketRef.current.emit("THROW_NONHAZARDOUS");
      else if (wasteType === "equipment") socketRef.current.emit("STERILIZE_EQUIPMENTS");

      // Frontend timer for UI feedback
      // Backend will send choice prompt after completion
      timerRef.current = setTimeout(() => {
        setStatus("✅ Waste successfully thrown.");
      }, 3000);
    }
  };

  const startNewDetection = () => {
    if (socketRef.current && !isDetecting) {
      setWasteType(null);
      setStatus("Starting new detection...");
      setIsDetecting(true);
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

  // Styling
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

  // UI
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <div className="flex flex-col items-center justify-center h-screen text-white">
        {/* Connection indicator */}
        <div className="absolute top-4 right-4">
          <div className={`flex items-center ${isConnected ? "text-green-400" : "text-red-400"}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? "bg-green-400" : "bg-red-400"}`}></div>
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>

        <h1 className="text-5xl font-bold">
          S3YF <span className="text-blue-300 border-b-4 border-blue-300 pb-2">BIN</span>
        </h1>
        <h2 className="text-3xl mt-4">STERILIZATION | THROW</h2>

        <div className="text-center mt-4">
          <p className={`text-2xl font-bold ${statusColor}`}>{status}</p>
          {confidence > 0 && (
            <p className="text-lg mt-2">
              Confidence: {confidence}% | Last Detection: {lastDetection}
            </p>
          )}
        </div>

        {/* Camera Feed */}
        {frameUrl ? (
          <div className="relative mt-4">
            <img
              src={frameUrl}
              className="w-full max-w-lg border-2 border-blue-500 rounded-lg shadow-lg"
              alt="YOLO Frame"
            />
          </div>
        ) : (
          <p className="text-lg mt-4">Waiting for camera stream...</p>
        )}

        {/* Action Buttons */}
        {!isDetecting && wasteType && (
          <button
            onClick={() =>
              handleAction(wasteType === "equipment" ? "STERILIZE EQUIPMENTS" : "Throwing Waste")
            }
            className={`${getButtonColor()} text-white font-bold py-3 px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105`}
          >
            {getButtonText()}
          </button>
        )}

        {!isDetecting && !wasteType && !showWarningModal && !showOptions && (
          <button
            onClick={startNewDetection}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105"
          >
            START NEW DETECTION
          </button>
        )}

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 bg-green-600 hover:bg-green-800 text-white font-bold py-3 px-10 rounded-full shadow-md transform transition-transform hover:scale-105"
        >
          BACK
        </button>

        {/* Warning Modal - Stops detection until user continues */}
        {showWarningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl text-center text-black w-96 border-2 border-red-500">
              <h3 className="text-xl font-bold mb-4 text-red-600">⚠️ Multiple Wastes Detected</h3>
              <p className="mb-6 text-red-500 font-semibold">
                Please throw waste or put equipment one by one.
              </p>
              <button
                onClick={handleContinueDetection}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full"
              >
                Continue Detection
              </button>
            </div>
          </div>
        )}

        {/* End/Continue Modal - After action completion */}
        {showOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl text-center text-black w-96">
              <h3 className="text-xl font-bold mb-4">Action Complete</h3>
              <p className="mb-6">Do you want to end detection or continue?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleEndDetection}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full"
                >
                  End
                </button>
                <button
                  onClick={handleContinueDetection}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cotton Modal */}
        {showCottonPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl text-center text-black w-96">
              <h3 className="text-xl font-bold mb-4">Cotton Detected</h3>
              <p className="mb-6">Is the cotton used or unused?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleCottonChoice("used")}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full"
                >
                  Used (Hazardous)
                </button>
                <button
                  onClick={() => handleCottonChoice("unused")}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-full"
                >
                  Unused (Non-Hazardous)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ThrowWaste;