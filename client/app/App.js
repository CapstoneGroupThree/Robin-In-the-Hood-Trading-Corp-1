import React from "react";
import { useSelector } from "react-redux";

import Navbar from "../features/navbar/Navbar";
import AppRoutes from "./AppRoutes";

const App = () => {
  const isLoggedIn = useSelector((state) => !!state.auth.me.id);
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            React Native App is in development
          </h1>
          <p className="text-gray-600">
            Please visit the site on your desktop.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {isLoggedIn ? (
        <div className="h-screen w-screen overflow-hidden flex">
          <nav className="w-1/6  h-screen p-4 NAV-bg ">
            <Navbar />
          </nav>
          <main className="w-5/6">
            <AppRoutes />
          </main>
          {/* <h1>Yolo</h1> */}
        </div>
      ) : (
        <div>
          <AppRoutes />
        </div>
      )}
    </div>
  );
};

export default App;
