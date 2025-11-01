import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

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
    const s = io("http://localhost:5000", { transports: ["websocket"] });

    s.on("connect", () => {
      setError(null);
      s.emit("subscribe_ultrasonic");
    });

    s.on("disconnect", () => {
      setError("Connection lost");
    });

    s.on("ultrasonic_update", (data) => {
      setWasteLevels({
        SYRINGE: data.syringe_pct ?? 0,
        "HAZARDOUS WASTE": data.hazardous_pct ?? 0,
        "NON-HAZARDOUS WASTE": data.nonhazardous_pct ?? 0,
      });

      const values = [
        data.syringe_pct,
        data.hazardous_pct,
        data.nonhazardous_pct,
      ];

      if (values.some((v) => v >= 100)) {
        setStatus("CRITICAL LEVEL");
        setWarningMessage("Immediate Disposal Required");
        setTextColor("text-red-600");
      } else {
        setStatus("REAL-TIME BIN STATUS");
        setWarningMessage("Monitoring waste levels...");
        setTextColor("text-white");
      }
    });

    return () => {
      s.emit("unsubscribe_ultrasonic");
      s.disconnect();
    };
  }, []);

  const getColorForLevel = (percentage) => {
    if (percentage >= 100) return "bg-red-600";
    if (percentage >= 75) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-400";
    return "bg-green-500";
  };

  const getTextStatus = (percentage) => {
    if (percentage >= 100) return "FULL";
    if (percentage >= 90) return "ALMOST FULL";
    if (percentage >= 60) return "HALF FULL";
    if (percentage >= 30) return "LOW LEVEL";
    return "EMPTY";
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 sm:px-6 md:px-10 py-10"
      style={{ backgroundImage: "url('/background1.jpg')" }}
    >
      <motion.h1
        className="text-4xl sm:text-5xl md:text-6xl font-bold text-white text-center drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        S3YF <span className="text-blue-300">BIN</span>
      </motion.h1>

      <motion.h2
        className="text-2xl sm:text-3xl mt-3 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-center"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        BIN STATUS
      </motion.h2>

      <p className="text-lg sm:text-xl font-bold mt-4 text-white text-center">
        REAL-TIME FILL LEVEL
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mt-8 w-full max-w-6xl place-items-center">
        {Object.keys(wasteLevels).map((bin) => {
          const percentage = wasteLevels[bin];
          const binStatus = getTextStatus(percentage);

          return (
            <motion.div
              key={bin}
              className="relative w-56 sm:w-60 md:w-64 h-64 sm:h-72 md:h-80 bg-gray-200 rounded-t-3xl rounded-b-xl shadow-xl border-4 border-white overflow-hidden"
            >
              <motion.div
                className={`absolute bottom-0 w-full ${getColorForLevel(percentage)}`}
                initial={{ height: 0 }}
                animate={{ height: `${percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />

              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-36 h-6 bg-gray-700 rounded-t-xl shadow-md" />

              <p className="absolute inset-x-0 top-1/3 text-center font-bold text-3xl text-white drop-shadow-md">
                {percentage}%
              </p>

              <p className="absolute inset-x-0 top-[55%] text-center text-sm font-extrabold text-white drop-shadow-md">
                {binStatus}
              </p>

              <p className="absolute inset-x-0 bottom-2 text-center font-bold text-white drop-shadow-lg text-sm sm:text-base md:text-lg px-2">
                {bin}
              </p>
            </motion.div>
          );
        })}
      </div>

      {error && (
        <p className="text-red-400 font-bold mt-2 text-sm sm:text-base">
          {error}
        </p>
      )}

      {status && (
        <div className="mt-8 text-center px-4 sm:px-6">
          <p className={`text-xl font-bold ${textColor}`}>{status}</p>
          <p className="mt-1 text-gray-300 text-sm sm:text-base">
            {warningMessage}
          </p>
        </div>
      )}

      <motion.button
        className="mt-10 bg-white/20 backdrop-blur-md px-8 py-3 text-white font-bold rounded-full border border-white/40 hover:bg-white/30 transition-all shadow-md text-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/dashboard")}
      >
        BACK
      </motion.button>
    </div>
  );
};

export default BinStatus;
