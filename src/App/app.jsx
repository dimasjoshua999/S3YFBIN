import { AnimatePresence } from "framer-motion";
import { Route, BrowserRouter as Router, Routes, useLocation } from "react-router-dom";
import ThrowWaste from '../backend/throwwaste';
import Dashboard from '../Front-end/dashboard';
import Welcome from '../Front-end/welcome';

import "./styles.css";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/throw-waste" element={<ThrowWaste />} />
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
