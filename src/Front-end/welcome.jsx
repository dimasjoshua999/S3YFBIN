import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Welcome = () => {
  const [showLine, setShowLine] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Start underline animation after 0.5 seconds
    const lineTimer = setTimeout(() => {
      setShowLine(true);
    }, 1000);

    // Navigate to dashboard after 3 seconds
    const navigationTimer = setTimeout(() => {
      navigate("/dashboard");
    }, 5000);

    // Cleanup timers on unmount
    return () => {
      clearTimeout(lineTimer);
      clearTimeout(navigationTimer);
    };
  }, [navigate]);

  return (
    <div
      className="flex flex-col items-center justify-center text-white min-h-screen px-4"
      style={{
        background: "url('/background1.jpg') no-repeat center center fixed",
        backgroundSize: "cover",
      }}
    >
      {/* Subtitle */}
      <motion.h3
        className="text-base sm:text-lg md:text-xl font-light uppercase tracking-wide mb-2 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        WELCOME TO
      </motion.h3>

      {/* Main Title */}
      <motion.div
        className="relative mt-2 text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        <span className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">S3YF</span>
        <span className="text-[#5DE2F0] drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]"> BIN</span>

        {/* Underline Animation */}
        <motion.div
          className="absolute left-0 bottom-[-5px] h-1 bg-[#5DE2F0]"
          initial={{ width: 0 }}
          animate={{ width: showLine ? "100%" : "0%" }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Loading Indicator */}
      <motion.div
        className="mt-8 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-[#5DE2F0] rounded-full"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Welcome;