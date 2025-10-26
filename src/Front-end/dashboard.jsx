import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen text-white px-4 bg-fixed"
      style={{
        backgroundImage: "url('/background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Title */}
      <motion.h1
        className="text-4xl sm:text-5xl font-bold drop-shadow-lg text-center"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ textShadow: "0 3px 6px rgba(0,0,0,0.6)" }}
      >
        S3YF{" "}
        <span className="text-blue-300">
          BIN
        </span>
      </motion.h1>

      <motion.h2
        className="text-2xl sm:text-3xl mt-4 drop-shadow-md text-center"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
      >
        DASHBOARD
      </motion.h2>

      {/* Button Container */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-sm sm:max-w-lg md:max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {[
          { text: "BIN", action: () => navigate("/throw-waste") },
          { text: "BIN STATUS", action: () => navigate("/bin-status") },
          { text: "HELP", action: () => navigate("/help") },
          { text: "ABOUT US", action: () => navigate("/AboutUs") },
        ].map((btn, index) => (
          <motion.button
            key={index}
            onClick={btn.action}
            className="bg-white/20 backdrop-blur-lg text-white font-extrabold text-lg sm:text-xl md:text-2xl rounded-2xl w-full h-24 sm:h-32 flex items-center justify-center shadow-lg border border-white/30 hover:bg-white/30 transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              textShadow: "0 2px 6px rgba(0,0,0,0.6)",
              transformOrigin: "center",
            }}
          >
            {btn.text}
          </motion.button>
        ))}
      </motion.div>

      {/* Back Button */}
      <motion.button
        onClick={() => navigate("/welcome")}
        className="mt-8 bg-white/20 backdrop-blur-lg border border-white/30 text-white font-extrabold text-base sm:text-lg md:text-xl py-3 px-10 rounded-full shadow-lg hover:bg-white/30 transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ textShadow: "0 2px 6px rgba(0,0,0,0.6)" }}
      >
        BACK
      </motion.button>
    </div>
  );
}

export default Dashboard;
