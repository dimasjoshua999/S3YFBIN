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
  const [wasteType, setWasteType] = useState(null);
  const [frameUrl, setFrameUrl] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSterilizingEquipments, setIsSterilizingEquipments] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showCottonPrompt, setShowCottonPrompt] = useState(false); 
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  // ---------------------------
  // SOCKET.IO CONNECTION
  // ---------------------------
  useEffect(() => {
    const socket = io("http://192.168.0.108:3000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);
      setStatus("Connected to server, waiting for detection...");
      setIsDetecting(true);
    });

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
      setStatus(`❌ Connection error: ${error.message}`);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      setStatus("❌ Disconnected from server. Attempting to reconnect...");
    });

    socket.on("handshake", (data) => {
      console.log("Server handshake:", data.message);
      setStatus("System ready for waste detection");
    });

    socket.on("pong", () => {
      console.log("Received pong from server");
    });

    socket.on("detection_event", (data) => {
      if (data.frame) setFrameUrl(data.frame); // ✅ Real-time frame from backend
      const label = data.label ? data.label.trim().toLowerCase() : "none";
      setConfidence(data.confidence || 0);
      setLastDetection(new Date().toLocaleTimeString());
      setIsDetecting(false);

      if (label === "none") {
        setWasteType(null);
        setStatus("No waste detected. Please place waste in front of camera.");
      } 
      else if (label === syringeLabel) {
        setWasteType(syringeLabel);
        setStatus(`⚠️ Syringe Detected! (${data.confidence}% confident)`);
        new Audio("/alert.mp3").play().catch((e) => console.log("Audio play failed:", e));
      } 
      else if (hazardous.includes(label)) {
        setWasteType("hazardous");
        setStatus(`🔴 Hazardous Waste (${label}) Detected! (${data.confidence}% confident)`);
      } 
      else if (nonhazardous.includes(label)) {
        setWasteType("nonhazardous");
        setStatus(`🟢 Non-Hazardous Waste (${label}) Detected! (${data.confidence}% confident)`);
      }
      else if (equipments.includes(label)) {
        setWasteType("equipment");
        setStatus(`⚪ Equipment Detected: ${label.toUpperCase()} (${data.confidence}% confident)`);
      }
      else if (label === otherwaste) {
        setShowCottonPrompt(true); // 🧩 trigger cotton prompt
        setStatus(`🟡 Cotton Detected (${data.confidence}% confident)`);
      }
      else {
        setWasteType("other");
        setStatus(`⚪ Unrecognized Item (${label}) Detected (${data.confidence}% confident)`);
      }
    });

    socket.on("frame_update", (data) => {
      if (data.image) setFrameUrl(data.image);
    });

    socket.on("server_message", (data) => {
      if (data.type === "error") {
        console.error("Error from server:", data.message);
        setStatus(`❌ Error: ${data.message}`);
      } else if (data.type === "status") {
        setStatus(data.message);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ---------------------------
  // ACTION HANDLERS
  // ---------------------------
  const handleAction = (action) => {
    if (action === "STERILIZE EQUIPMENTS") {
      if (isSterilizingEquipments) return;
      setIsSterilizingEquipments(true);
      setStatus("Sterilizing Equipments in Progress...");

      if (socketRef.current) {
        socketRef.current.emit("STERILIZE_EQUIPMENTS");
      }

      timerRef.current = setTimeout(() => {
        setStatus("Equipments Sterilization Completed");
        setIsSterilizingEquipments(false);
        setShowOptions(true);
      }, 20000);
    } 

    else if (action === "Throwing Waste") {
      setStatus("Throwing waste...");

      if (socketRef.current) {
        if (wasteType === syringeLabel) {
          socketRef.current.emit("THROW_SYRINGE");
        } else if (equipments.includes(wasteType)) {
          socketRef.current.emit("STERILIZE_EQUIPMENTS");
        } else if (wasteType === "hazardous") {
          socketRef.current.emit("THROW_HAZARDOUS");
        } else if (wasteType === "nonhazardous") {
          socketRef.current.emit("THROW_NONHAZARDOUS");
        }
      }

      timerRef.current = setTimeout(() => {
        setStatus("Waste thrown successfully");
        setShowOptions(true);
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
    if (socketRef.current) socketRef.current.emit("end_detection");
    setShowOptions(false);
    setWasteType(null);
    setStatus("Detection ended.");
    setIsDetecting(false);
  };

  const handleContinueDetection = () => {
    if (socketRef.current) socketRef.current.emit("start_detection");
    setShowOptions(false);
    setWasteType(null);
    setStatus("Continuing detection...");
    setIsDetecting(true);
  };

  // ---------------------------
  // 🧩 COTTON PROMPT HANDLER
  // ---------------------------
  const handleCottonChoice = (choice) => {
    setShowCottonPrompt(false);
    if (choice === "used") {
      setWasteType("hazardous");
      setStatus("🩸 Used Cotton Detected → Throwing to Hazardous Bin");
    } else {
      setWasteType("nonhazardous");
      setStatus("🧻 Unused Cotton Detected → Throwing to Non-Hazardous Bin");
    }
  };

  // ---------------------------
  // BUTTON STYLES
  // ---------------------------
  const getButtonColor = () => {
    if (!wasteType) return "bg-gray-500 cursor-not-allowed";
    if (wasteType === syringeLabel) return "bg-orange-600 hover:bg-orange-700";
    if (wasteType === "nonhazardous") return "bg-green-600 hover:bg-green-700";
    if (wasteType === "hazardous") return "bg-red-600 hover:bg-red-700";
    if (wasteType === "equipment") return "bg-blue-500 hover:bg-blue-600";
    return "bg-yellow-500 hover:bg-yellow-600";
  };

  const getButtonText = () => {
    if (!wasteType) return "Waiting for Detection...";
    if (wasteType === syringeLabel) return "THROW SYRINGE";
    if (wasteType === "nonhazardous") return "THROW NON-HAZARDOUS WASTE";
    if (wasteType === "hazardous") return "THROW HAZARDOUS WASTE";
    if (wasteType === "equipment") return "STERILIZE EQUIPMENTS";
    return "THROW OTHER WASTE";
  };

  // ---------------------------
  // UI RENDER
  // ---------------------------
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/images/background.png')" }}
    >
      <div className="flex flex-col items-center justify-center h-screen text-white">

        {/* Connection Indicator */}
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
          <p className="text-2xl font-bold">{status}</p>
          {confidence > 0 && (
            <p className="text-lg mt-2">
              Confidence: {confidence}% | Last Detection: {lastDetection}
            </p>
          )}
        </div>

        {/* YOLO Camera Feed */}
        {frameUrl ? (
          <div className="relative mt-4">
            <img
              src={frameUrl}
              className="w-full max-w-lg border-2 border-blue-500 rounded-lg shadow-lg"
              alt="YOLO Annotated Frame"
            />
            {wasteType && (
              <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white p-2 rounded-tl-lg rounded-br-lg">
                {wasteType === syringeLabel && "⚠️ "}
                {wasteType === "nonhazardous" && "🟢 "}
                {wasteType === "hazardous" && "🔴 "}
                {wasteType === "equipment" && "⚪ "}
                {wasteType.toUpperCase()}
              </div>
            )}
          </div>
        ) : (
          <p className="text-lg mt-4">Waiting for camera stream...</p>
        )}

        {/* ACTION BUTTONS */}
        {!isDetecting && wasteType && wasteType !== "equipment" && (
          <button
            onClick={() => handleAction("Throwing Waste")}
            className={`${getButtonColor()} text-white font-bold py-3 px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105`}
          >
            {getButtonText()}
          </button>
        )}

        {!isDetecting && wasteType === "equipment" && (
          <button
            onClick={() => handleAction("STERILIZE EQUIPMENTS")}
            disabled={isSterilizingEquipments}
            className={`${
              isSterilizingEquipments
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-700"
            } text-white font-bold py-3 px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105`}
          >
            {isSterilizingEquipments ? "STERILIZING EQUIPMENTS..." : "STERILIZE EQUIPMENTS"}
          </button>
        )}

        {!isDetecting && !wasteType && (
          <button
            onClick={startNewDetection}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105"
          >
            START NEW DETECTION
          </button>
        )}

        {/* BACK BUTTON */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 bg-green-600 hover:bg-green-800 text-white font-bold py-3 px-10 rounded-full shadow-md transform transition-transform hover:scale-105"
        >
          BACK
        </button>

        {/* MODAL: End or Continue Detection */}
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
                  End Detection
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

        {/* 🧩 COTTON PROMPT MODAL */}
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
