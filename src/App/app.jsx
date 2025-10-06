import { AnimatePresence } from "framer-motion";
import { Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import ThrowWaste from '../backend/throwwaste';
import AboutUs from '../Buttons/AboutUs';
import BinStatus from '../Buttons/BinStatus';
import Help from '../Buttons/help';
import Dashboard from '../Front-end/dashboard';
import Welcome from '../Front-end/welcome';

import "./styles.css";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/throw-waste" element={<ThrowWaste />} />
        <Route path="/bin-status" element={<BinStatus />} />
        <Route path="/help" element={<Help />} />
        <Route path="/AboutUs" element={<AboutUs />} />
        {/* Optional: Redirect root to /welcome */}
        <Route path="*" element={<Welcome />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
