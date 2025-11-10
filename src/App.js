import React from 'react'
import { Routes, Route } from 'react-router-dom'
import JavaCompiler from './Pages/JavaCompiler'
import PythonCompiler from './Pages/PythonCompiler'
import JsCompiler from './Pages/JSCompiler'
import './App.css'
import Sidebar from './Components/SideBar'
import NotFound from './Pages/NotFound'

const App = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<JavaCompiler />} />
          <Route path="/compile/python" element={<PythonCompiler />} />
          <Route path="/compile/js" element={<JsCompiler />} />
          <Route path="/compile/java" element={<JavaCompiler />} />
          <Route path="/*" element={<NotFound/>} />
        </Routes>
      </div>
    </div>
  )
}

export default App
