import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const teamMembers = [
  {
    name: "Efren Jr M. Cal",
    role: "Hardware Specialist",
    subRole: "System Integration",
    img: "/CAL.jpg",
  },
  {
    name: "Joshua B. Dimas",
    role: "Frontend & Backend Developer",
    subRole: "System Logic and Functionality",
    img: "/DIMAS.jpg",
  },
  {
    name: "Paul Allen M. Parreño",
    role: "Database Manager",
    subRole: "Data Handling & Storage",
    img: "/PARRENO.jpg",
  },
  {
    name: "Jower L. Tanglao Jr.",
    role: "UI Designer",
    subRole: "Interface & User Experience",
    img: "/TANGLAO.jpg",
  },
];

const AboutUs = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleClick = (index) => {
    setSelected(selected === index ? null : index);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-cover bg-center px-4 sm:px-6 md:px-10 py-10 text-white"
      style={{ backgroundImage: "url('/background1.jpg')" }}
    >
      {/* Title */}
      <motion.h1
        className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 text-center drop-shadow-[0_3px_8px_rgba(0,0,0,0.8)]"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        ABOUT <span className="text-blue-300">S3YF BIN</span>
      </motion.h1>

      {/* Description */}
      <motion.p
        className="max-w-4xl text-justify text-white/90 text-base sm:text-lg leading-relaxed mb-12 bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/30 shadow-lg"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <strong>S3YF Bin</strong>, pronounced as <em>“safe”</em>, stands for{" "}
        <strong>Sterilization and Segregation System</strong>. It is a
        conveyor-belt-powered segregation system that automatically separates{" "}
        <strong>hazardous</strong>, <strong>non-hazardous</strong>, and{" "}
        <strong>syringe wastes</strong>. Aside from waste management, it also{" "}
        <strong>sterilizes hospital equipment</strong> such as scissors,
        stethoscopes, and sphygmomanometers — ensuring a safer and cleaner
        environment for healthcare workers.
      </motion.p>

      {/* Team Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 justify-center w-full max-w-6xl">
        {teamMembers.map((member, index) => (
          <motion.div
            key={index}
            className="flex flex-col items-center cursor-pointer w-full"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 200 }}
            onClick={() => handleClick(index)}
          >
            {/* Glass Card */}
            <motion.div
              className={`backdrop-blur-xl bg-white/20 w-40 sm:w-44 md:w-48 h-40 sm:h-44 md:h-48 flex items-center justify-center rounded-2xl shadow-xl border transition-all ${
                selected === index
                  ? "border-blue-400 shadow-blue-400/30"
                  : "border-white/30"
              }`}
            >
              <img
                src={member.img}
                alt={member.name}
                className="w-28 sm:w-32 md:w-36 h-28 sm:h-32 md:h-36 rounded-xl border-4 border-white/40 object-cover shadow-md"
              />
            </motion.div>

            {/* Name */}
            <motion.h2
              className="text-base sm:text-lg md:text-xl font-bold mt-4 text-center hover:text-blue-400 transition-colors px-2"
              whileHover={{ scale: 1.05 }}
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
            >
              {member.name}
            </motion.h2>

            {/* Role Details */}
            <AnimatePresence>
              {selected === index && (
                <motion.div
                  className="backdrop-blur-lg bg-white/15 w-64 sm:w-72 p-3 sm:p-4 mt-2 rounded-xl text-center shadow-lg border border-white/30"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <p
                    className="font-bold text-blue-300 text-base sm:text-lg tracking-wide"
                    style={{
                      textShadow:
                        "0 1px 3px rgba(0,0,0,0.5), 0 0 8px rgba(50,150,255,0.5)",
                    }}
                  >
                    {member.role}
                  </p>
                  <p
                    className="text-gray-100 text-sm sm:text-base mt-1"
                    style={{
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    }}
                  >
                    {member.subRole}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Back Button */}
      <motion.button
        className="mt-12 bg-white/20 backdrop-blur-md px-8 py-3 sm:py-4 text-white font-bold rounded-full border border-white/40 hover:bg-white/30 transition-all shadow-md text-sm sm:text-base md:text-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
        onClick={() => navigate(-1)}
      >
        BACK
      </motion.button>
    </div>
  );
};

export default AboutUs;
