import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BinStatus = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [textColor, setTextColor] = useState("text-white");
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setError(null);
      } catch (err) {
        setError("Connection lost. Please try again.");
      }
    };
    checkConnection();
  }, []);

  const checkBinStatus = (binType) => {
    if (error) return;

    let percentage = Math.floor(Math.random() * 101);
    let newStatus, newWarningMessage, newTextColor;

    if (percentage === 100) {
      newStatus = "CRITICAL";
      newTextColor = "text-red-600 animate-blink";
      newWarningMessage = "Immediate Disposal Required";
    } else if (percentage >= 85) {
      newStatus = "HIGH CONTAMINATION RISK";
      newTextColor = "text-orange-500 animate-blink";
      newWarningMessage = "Approaching Capacity, Plan for Disposal";
    } else if (percentage >= 51) {
      newStatus = "MODERATE WASTE LEVEL";
      newTextColor = "text-yellow-400 animate-blink";
      newWarningMessage = "Waste Level is Manageable";
    } else if (percentage === 0) {
      newStatus = "NO WASTE PRESENT";
      newTextColor = "text-green-500 animate-blink";
      newWarningMessage = "Bin is Ready for Use";
    } else {
      newStatus = "LOW WASTE ACCUMULATION";
      newTextColor = "text-lime-400 animate-blink";
      newWarningMessage = "Minimal Waste Detected";
    }

    setStatus(`${binType}: ${newStatus}`);
    setWarningMessage(newWarningMessage);
    setTextColor(newTextColor);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/background1.jpg')" }}
    >
      {/* Title */}
      <motion.h1
        className="text-5xl font-bold text-white"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        S3YF{" "}
        <span className="text-blue-300 border-b-4 border-blue-300 pb-2">BIN</span>
      </motion.h1>

      {/* Subheading */}
      <motion.h2
        className="text-3xl mt-4 text-white"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        BIN STATUS
      </motion.h2>

      {/* Bin Selection */}
      <p className="text-2xl font-bold mt-4 text-white">SELECT BIN TO CHECK STATUS:</p>
      <div className="flex gap-4 mt-4">
        {["SYRINGE", "HAZARDOUS WASTE", "NON-HAZARDOUS WASTE"].map((bin, index) => (
          <button
            key={index}
            onClick={() => checkBinStatus(bin)}
            className="bg-[#5DE2F0] text-white font-bold py-2 px-5 rounded-full shadow-lg hover:bg-[#3CB3C6]"
            disabled={error}
          >
            {bin}
          </button>
        ))}
      </div>

      {/* Status Output */}
      {status && (
        <div className="mt-4 text-center">
          <p className={`text-xl font-bold ${textColor}`}>{status}</p>
          <p className="mt-2 text-gray-300">{warningMessage}</p>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mt-6 bg-green-600 hover:bg-green-800 text-white font-bold py-3 px-10 rounded-full shadow-md"
      >
        BACK
      </button>
    </div>
  );
};

export default BinStatus;
