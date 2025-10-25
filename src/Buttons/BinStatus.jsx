import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BinStatus = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [warningMessage, setWarningMessage] = useState("");
  const [textColor, setTextColor] = useState("text-white");
  const [error, setError] = useState(null);
  const [wasteLevels, setWasteLevels] = useState({
    SYRINGE: 0,
    "HAZARDOUS WASTE": 0,
    "NON-HAZARDOUS WASTE": 0,
  });

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

  // Select only from 25, 50, 75, 100
  const getRandomPercentage = () => {
    const levels = [25, 50, 75, 100];
    return levels[Math.floor(Math.random() * levels.length)];
  };

  const getColorForLevel = (percentage) => {
    if (percentage === 25) return "bg-green-500";
    if (percentage === 50) return "bg-yellow-400";
    if (percentage === 75) return "bg-orange-500";
    if (percentage === 100) return "bg-red-600";
    return "bg-gray-400";
  };

  const checkBinStatus = (binType) => {
    if (error) return;

    const percentage = getRandomPercentage();
    setWasteLevels((prev) => ({ ...prev, [binType]: percentage }));

    let newStatus, newWarningMessage, newTextColor;

    switch (percentage) {
      case 25:
        newStatus = "LOW WASTE ACCUMULATION";
        newTextColor = "text-green-400";
        newWarningMessage = "Minimal Waste Detected";
        break;
      case 50:
        newStatus = "MODERATE WASTE LEVEL";
        newTextColor = "text-yellow-400";
        newWarningMessage = "Waste Level is Manageable";
        break;
      case 75:
        newStatus = "HIGH WASTE LEVEL";
        newTextColor = "text-orange-500";
        newWarningMessage = "Approaching Capacity, Plan for Disposal";
        break;
      case 100:
        newStatus = "CRITICAL LEVEL";
        newTextColor = "text-red-600";
        newWarningMessage = "Immediate Disposal Required";
        break;
      default:
        newStatus = "UNKNOWN STATUS";
        newTextColor = "text-white";
        newWarningMessage = "";
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

      <p className="text-2xl font-bold mt-4 text-white">
        SELECT BIN TO CHECK STATUS:
      </p>

      {/* Animated Bins */}
      <div className="flex gap-8 mt-8">
        {["SYRINGE", "HAZARDOUS WASTE", "NON-HAZARDOUS WASTE"].map((bin, index) => {
          const percentage = wasteLevels[bin];
          const binColor = getColorForLevel(percentage);
          return (
            <motion.div
              key={index}
              className="relative w-40 h-52 bg-gray-200 rounded-t-3xl rounded-b-xl shadow-lg border-4 border-white cursor-pointer overflow-hidden"
              whileHover={{ scale: 1.05 }}
              onClick={() => checkBinStatus(bin)}
            >
              {/* Bin Fill (animated) */}
              <motion.div
                className={`absolute bottom-0 w-full ${binColor}`}
                initial={{ height: 0 }}
                animate={{ height: `${percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              ></motion.div>

              {/* Bin Lid */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-700 rounded-t-xl"></div>

              {/* Bin Label */}
              <p className="absolute inset-x-0 bottom-2 text-center font-bold text-white drop-shadow-lg">
                {bin}
              </p>

              {/* Percentage */}
              <p className="absolute inset-x-0 top-1/2 text-center font-bold text-xl text-white drop-shadow-md">
                {percentage}%
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Status Output */}
      {status && (
        <div className="mt-6 text-center">
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
