import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const syringeLabel = "syringe";
const infectiousWastes = ["gloves", "head-cap", "disposable-mask"];

function ThrowWaste() {
  const [status, setStatus] = useState("Initializing...");
  const [wasteType, setWasteType] = useState(null);
  const [frameUrl, setFrameUrl] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [lastDetection, setLastDetection] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSterilizing, setIsSterilizing] = useState(false);
  const [isSanitizing, setIsSanitizing] = useState(false);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const socket = io("http://192.168.250.209:3000", {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
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
      console.log("Detection event:", data);
      const label = data.label ? data.label.trim().toLowerCase() : "none";
      setConfidence(data.confidence || 0);
      setLastDetection(new Date().toLocaleTimeString());
      setIsDetecting(false);

      if (label === "none") {
        setWasteType(null);
        setStatus("No waste detected. Please place waste in front of camera.");
      } else if (label === syringeLabel) {
        setWasteType(syringeLabel);
        setStatus(`⚠️ Syringe Detected! (${data.confidence}% confident)`);
        new Audio('/alert.mp3').play().catch(e => console.log('Audio play failed:', e));
      } else if (infectiousWastes.includes(label)) {
        setWasteType("infectious");
        setStatus(`🔴 Infectious Waste (${label}) Detected! (${data.confidence}% confident)`);
      } else {
        setWasteType("other");
        setStatus(`⚪ Other Waste Type (${label}) Detected (${data.confidence}% confident)`);
      }
    });

    socket.on("frame_update", (data) => {
      if (data.image) {
        setFrameUrl(data.image);
      }
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
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleAction = (action) => {
    if (action === "Sterilization") {
      if (isSterilizing) return; // Prevent multiple clicks
      setIsSterilizing(true);
      setStatus("Sterilization in Progress...");
      
      if (socketRef.current) {
        socketRef.current.emit("STERILIZE");
      }

      // Set 20-second timer for completion
      timerRef.current = setTimeout(() => {
        setStatus("Sterilization Completed");
        setIsSterilizing(false);
      }, 5000);
    }
    else if (action === "Sanitization") {
      if (isSanitizing) return; // Prevent multiple clicks
      setIsSanitizing(true);
      setStatus("Sanitization in Progress...");
      
      if (socketRef.current) {
        socketRef.current.emit("SANITIZE");
      }

      // Set 20-second timer for completion
      timerRef.current = setTimeout(() => {
        setStatus("Sanitization Completed");
        setIsSanitizing(false);
      }, 20000);
    }
    else if (action === "Throwing Waste") {
      setTimeout(() => {
        setWasteType(null);
        setStatus("Starting new detection...");
        setIsDetecting(true);
        if (socketRef.current) {
          socketRef.current.emit("start_detection");
        }
      }, 2000);
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

  const getButtonColor = () => {
    if (!wasteType) return "bg-gray-500 cursor-not-allowed";
    if (wasteType === syringeLabel) return "bg-orange-600 hover:bg-orange-700";
    if (wasteType === "infectious") return "bg-red-600 hover:bg-red-700";
    return "bg-yellow-500 hover:bg-yellow-600";
  };

  const getButtonText = () => {
    if (!wasteType) return "Waiting for Detection...";
    if (wasteType === syringeLabel) return "THROW SYRINGE";
    if (wasteType === "infectious") return "THROW INFECTIOUS WASTE";
    return "THROW OTHER WASTE";
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/images/background.png')" }}
    >
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <div className="absolute top-4 right-4">
          <div className={`flex items-center ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <h1 className="text-5xl font-bold">
          S3YF <span className="text-blue-300 border-b-4 border-blue-300 pb-2">BIN</span>
        </h1>
        <h2 className="text-3xl mt-4">THROW WASTE</h2>

        <div className="text-center mt-4">
          <p className="text-2xl font-bold">{status}</p>
          {confidence > 0 && (
            <p className="text-lg mt-2">
              Confidence: {confidence}% | Last Detection: {lastDetection}
            </p>
          )}
        </div>

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
                {wasteType === "infectious" && "🔴 "}
                {wasteType === "other" && "⚪ "}
                {wasteType.toUpperCase()}
              </div>
            )}
          </div>
        ) : (
          <p className="text-lg mt-4">Waiting for camera stream...</p>
        )}

        {!isDetecting && wasteType && (
          <button
            onClick={() => handleAction("Throwing Waste")}
            className={`${getButtonColor()} text-white font-bold py-3 px-8 rounded-full shadow-lg mt-6 transform transition-transform hover:scale-105`}
          >
            {getButtonText()}
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

        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={() => handleAction("Sanitization")}
            disabled={isSanitizing}
            className={`${
              isSanitizing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-400 hover:bg-blue-600'
            } text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition-transform ${
              !isSanitizing && 'hover:scale-105'
            }`}
          >
            {isSanitizing ? 'SANITIZING...' : 'SANITIZE'}
          </button>
          <button
            onClick={() => handleAction("Sterilization")}
            disabled={isSterilizing}
            className={`${
              isSterilizing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-purple-400 hover:bg-purple-600'
            } text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition-transform ${
              !isSterilizing && 'hover:scale-105'
            }`}
          >
            {isSterilizing ? 'STERILIZING...' : 'STERILIZE'}
          </button>
        </div>

        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 bg-green-600 hover:bg-green-800 text-white font-bold py-3 px-10 rounded-full shadow-md transform transition-transform hover:scale-105"
        >
          BACK
        </button>
      </div>
    </div>
  );
}

export default ThrowWaste;