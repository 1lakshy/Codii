
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import JavaCompiler from './Pages/JavaCompiler'
import PythonCompiler from './Pages/PythonCompiler'
import './App.css'
import JsCompiler from './Pages/JSCompiler'

const App = () => {
  return (
   <>
   <Routes>
        <Route path="/" element={<JavaCompiler />} />
        <Route path="/python" element={<PythonCompiler />} />
        <Route path="/js" element={<JsCompiler />} />
        <Route
          path="*"
          element={<JavaCompiler />}
        />
    </Routes>
   </>
  )
}

export default App