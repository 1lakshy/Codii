import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Code2, TerminalSquare } from "lucide-react";
import { FaJava,FaPython,FaJs   } from "react-icons/fa";
import "./css/Sidebar.css";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="logo">
        {/* <div className="circle">∞</div> */}
      </div>

      <div className="nav-icons">
        <NavLink
          to="/compile/java"
          className={({ isActive }) => (isActive ? "icon-box active" : "icon-box")}
        >
          <FaJava size={22} />
          <span className="label">Java</span>
        </NavLink>

        <NavLink
          to="/compile/python"
          className={({ isActive }) => (isActive ? "icon-box active" : "icon-box")}
        >
          <FaPython  size={22} />
          <span className="label">Python</span>
        </NavLink>

        <NavLink
          to="/compile/js"
          className={({ isActive }) => (isActive ? "icon-box active" : "icon-box")}
        >
          <FaJs  size={22} />
          <span className="label">JS</span>
        </NavLink>

        {/* <NavLink
          to="/js"
          className={({ isActive }) => (isActive ? "icon-box active" : "icon-box")}
        >
          <Home size={22} />
          <span className="label">JS</span>
        </NavLink> */}
      </div>

      <div className="footer-text">Brand<br />Appairt</div>
    </div>
  );
};

export default Sidebar;
