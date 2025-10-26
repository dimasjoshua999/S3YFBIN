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
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 sm:px-6 md:px-10 py-10"
      style={{ backgroundImage: "url('/background1.jpg')" }}
    >
      {/* Title */}
      <motion.h1
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        S3YF{" "}
        <span className="text-blue-300">
          BIN
        </span>
      </motion.h1>

      {/* Subheading */}
      <motion.h2
        className="text-2xl sm:text-3xl mt-3 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-center"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        BIN STATUS
      </motion.h2>

      <p className="text-lg sm:text-xl font-bold mt-4 text-white text-center">
        SELECT BIN TO CHECK STATUS:
      </p>

      {/* Responsive Bin Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-8 w-full max-w-6xl place-items-center">
        {["SYRINGE", "HAZARDOUS WASTE", "NON-HAZARDOUS WASTE"].map(
          (bin, index) => {
            const percentage = wasteLevels[bin];
            const binColor = getColorForLevel(percentage);
            return (
              <motion.div
                key={index}
                className="relative w-56 sm:w-60 md:w-64 h-64 sm:h-72 md:h-80 bg-gray-200 rounded-t-3xl rounded-b-xl shadow-xl border-4 border-white cursor-pointer overflow-hidden transition-transform duration-300"
                whileHover={{ scale: 1.05 }}
                onClick={() => checkBinStatus(bin)}
              >
                {/* Bin Fill */}
                <motion.div
                  className={`absolute bottom-0 w-full ${binColor}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                ></motion.div>

                {/* Bin Lid */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-32 sm:w-36 h-6 bg-gray-700 rounded-t-xl shadow-md"></div>

                {/* Labels */}
                <p className="absolute inset-x-0 bottom-2 text-center font-bold text-white drop-shadow-lg text-sm sm:text-base md:text-lg px-2">
                  {bin}
                </p>
                <p className="absolute inset-x-0 top-1/2 text-center font-bold text-2xl sm:text-3xl text-white drop-shadow-md">
                  {percentage}%
                </p>
              </motion.div>
            );
          }
        )}
      </div>

      {/* Status Output */}
      {status && (
        <div className="mt-8 text-center px-4 sm:px-6">
          <p className={`text-lg sm:text-xl font-bold ${textColor}`}>
            {status}
          </p>
          <p className="mt-2 text-gray-300 text-sm sm:text-base">
            {warningMessage}
          </p>
        </div>
      )}

      {/* Back Button */}
      <motion.button
        className="mt-10 bg-white/20 backdrop-blur-md px-8 py-3 text-white font-bold rounded-full border border-white/40 hover:bg-white/30 transition-all shadow-md text-base sm:text-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
        onClick={() => navigate("/dashboard")}
      >
        BACK
      </motion.button>
    </div>
  );
};

export default BinStatus;
