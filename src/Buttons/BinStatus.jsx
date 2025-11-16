// THROWWASTE + BIN STATUS MERGED — TEXT ONLY
// Camera never stops, multiple waste flashes, bin full flashes

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const ThrowWaste = () => {
  const socketRef = useRef(null);

  // Detection States
  const [frame, setFrame] = useState(null);
  const [warning, setWarning] = useState("");
  const [isFlashing, setIsFlashing] = useState(false);

  // Bin Status States
  const [wasteLevels, setWasteLevels] = useState({
    SYRINGE: 0,
    "HAZARDOUS WASTE": 0,
    "NON-HAZARDOUS WASTE": 0,
  });

  // Flash timer
  const flashTimer = useRef(null);

  // ---- AUTO DETECTION (NO BUTTON) ----
  useEffect(() => {
    socketRef.current = io("http://localhost:5000", { transports: ["websocket"] });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("start_detection");
      socketRef.current.emit("subscribe_ultrasonic");
    });

    // Camera frames
    socketRef.current.on("frame", (data) => {
      setFrame(`data:image/jpeg;base64,${data}`);
    });

    // Multiple waste warning
    socketRef.current.on("multiple_waste_warning", () => {
      flashWarning("⚠ MULTIPLE WASTE DETECTED — PLEASE FIX");
    });

    // Ultrasonic bin levels
    socketRef.current.on("ultrasonic_update", (data) => {
      const updated = {
        SYRINGE: data.syringe_pct ?? 0,
        "HAZARDOUS WASTE": data.hazardous_pct ?? 0,
        "NON-HAZARDOUS WASTE": data.nonhazardous_pct ?? 0,
      };

      setWasteLevels(updated);

      // If any bin is full → flash warning
      if (Object.values(updated).some((v) => v >= 100)) {
        flashWarning("⚠ BIN IS FULL — IMMEDIATE DISPOSAL REQUIRED");
      }
    });

    return () => {
      socketRef.current.emit("stop_detection");
      socketRef.current.emit("unsubscribe_ultrasonic");
      socketRef.current.disconnect();
    };
  }, []);

  // ---- FLASH WARNING FUNCTION ----
  const flashWarning = (msg) => {
    setWarning(msg);
    setIsFlashing(true);

    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setIsFlashing(false);
    }, 2000);
  };

  // ---- TEXT STATUS LOGIC ----
  const getTextStatus = (percentage) => {
    if (percentage >= 100) return "FULL";
    if (percentage >= 90) return "ALMOST FULL";
    if (percentage >= 60) return "HALF FULL";
    if (percentage >= 30) return "LOW LEVEL";
    return "EMPTY";
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-5 bg-black text-white">

      {/* ---- Camera Feed ---- */}
      <div className="w-full flex justify-center">
        {frame ? (
          <img src={frame} alt="camera" className="w-[640px] h-[480px] border-2 border-white rounded-xl" />
        ) : (
          <p>Loading camera...</p>
        )}
      </div>

      {/* ---- Flashing Warning ---- */}
      {warning && (
        <motion.div
          animate={{ opacity: isFlashing ? [1, 0, 1] : 1 }}
          transition={{ duration: 1, repeat: isFlashing ? Infinity : 0 }}
          className="mt-4 text-xl font-bold text-red-500 text-center"
        >
          {warning}
        </motion.div>
      )}

      {/* ---- TEXT-ONLY BIN STATUS ---- */}
      <div className="mt-8 w-full max-w-xl">
        <h2 className="text-2xl font-bold mb-3 text-center">BIN STATUS</h2>

        {Object.keys(wasteLevels).map((bin) => {
          const pct = wasteLevels[bin];
          const status = getTextStatus(pct);

          return (
            <p key={bin} className="text-lg font-semibold mb-2 text-center">
              {bin}: {pct}% — {status}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default ThrowWaste;
