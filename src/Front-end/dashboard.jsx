import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex flex-col items-center justify-center h-screen text-white"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Title */}
      <motion.h1
        className="text-5xl font-bold"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        S3YF <span className="text-blue-300 border-b-4 border-blue-300 pb-2">BIN</span>
      </motion.h1>
      <motion.h2
        className="text-3xl mt-4"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        DASHBOARD
      </motion.h2>

      {/* Button Container */}
      <motion.div
        className="grid grid-cols-2 gap-4 mt-6 w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        {[
          { text: "BIN" , action: () => navigate("/throw-waste") },
          { text: "BIN STATUS", action: () => navigate("/bin-status") },
          { text: "HELP", action: () => navigate("/help") },
          { text: "ABOUT US", action: () => navigate("/AboutUs") },
        ].map((btn, index) => (
          <motion.button
            key={index}
            onClick={btn.action}
            className="bg-cyan-300 hover:bg-cyan-400 text-black font-extrabold text-2xl md:text-3xl py-6 px-10 rounded-xl w-full shadow-lg"
            whileHover={{ scale: 1.08, backgroundColor: "#38BDF8" }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {btn.text}
          </motion.button>
        ))}
      </motion.div>

      {/* Back Button */}
<motion.button
  onClick={() => navigate("/welcome")}
  className="mt-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-extrabold text-xl py-3 px-6 rounded-lg shadow-lg"
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.9 }}
  transition={{ duration: 0.2 }}
>
  <ArrowLeft className="w-6 h-6" />
  BACK
</motion.button>

    </motion.div>
  );
}

export default Dashboard;
