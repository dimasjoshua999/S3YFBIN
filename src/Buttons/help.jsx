import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Help = () => {
  const navigate = useNavigate();

  const steps = [
    { img: "18.png", text: "POWER ON THE SYSTEM" },
    { img: "19.png", text: "PLACE YOUR TRASH ON THE PLATFORM" },
    { img: "20.png", text: "CLICK DETECT THROW BUTTON" },
    { img: "21.png", text: "PROCEED WITH STERILIZATION" },
    { img: "22.png", text: "REPEAT STEPS IF NECESSARY" },
    { img: "23.png", text: "CHECK BINS' STATUS" },
    { img: "24.png", text: "DISPOSE WASTE IF FULL" },
    { img: "25.png", text: "SHUT DOWN THE SYSTEM" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 sm:px-6 md:px-10 py-10"
      style={{ backgroundImage: "url('/images/background.png')" }}
    >
      <motion.div
        className="flex flex-col items-center text-white w-full max-w-6xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Title */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)] text-center"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          S3YF{" "}
          <span className="text-blue-300">
            BIN
          </span>
        </motion.h1>

        <motion.h2
          className="text-2xl sm:text-3xl mt-4 font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] text-center"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          HELP GUIDE
        </motion.h2>

        {/* Step Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mt-10 w-full">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center text-center backdrop-blur-md bg-white/10 p-4 sm:p-6 rounded-2xl border border-white/30 shadow-lg hover:bg-white/20 transition-all duration-300"
            >
              <img
                src={step.img}
                alt={step.text}
                className="drop-shadow-lg w-24 sm:w-28 md:w-32 h-24 sm:h-28 md:h-32 object-contain mb-3"
              />
              <p className="text-white font-semibold text-base sm:text-lg md:text-xl tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {step.text}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Back Button */}
        <motion.button
          className="mt-12 bg-white/20 backdrop-blur-md px-6 sm:px-8 py-2 sm:py-3 text-sm sm:text-base md:text-lg text-white font-bold rounded-full border border-white/40 hover:bg-white/30 transition-all shadow-md"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
          onClick={() => navigate("/dashboard")}
        >
          BACK
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Help;
