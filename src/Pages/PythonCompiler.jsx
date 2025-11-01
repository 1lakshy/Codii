import React, { useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";


function PythonCompiler() {
  const [pythonCode, setPythonCode] = useState(`
print("Hello from Python in the browser!")
`);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Loading Pyodide...");
  const [isReady, setIsReady] = useState(false);
  const pyodideRef = useRef(null);
 useEffect(() => {
  const loadPyodideEnv = async () => {
    setStatus("Loading Pyodide...");
    // setOutput("Initializing Python environment...\n");

    try {
      if (!window.loadPyodide) {
        await import("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");
      }

      const pyodide = await window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
      });
      pyodideRef.current = pyodide;

      // Redirect stdout/stderr to React state
      await pyodide.runPythonAsync(`
import sys
from io import StringIO
import js

class JSOutput:
    def __init__(self):
        self.content = ""
    def write(self, text):
        self.content += text
        js.updateOutput(text)
    def flush(self):
        pass

sys.stdout = JSOutput()
sys.stderr = JSOutput()
      `);

      setStatus("Pyodide ready!");
      // setOutput((prev) => prev + "Python environment loaded successfully!\n");
      setIsReady(true);
    } catch (err) {
      setStatus("Error loading Pyodide");
      // setOutput((prev) => prev + "Error: " + err.message + "\n");
    }
  };

  // Add global function for Python's js.updateOutput()
  window.updateOutput = (text) => setOutput((prev) => prev + text);

  loadPyodideEnv();
}, []);

  

  const editorOptions = {
    autoIndent: "full",
    fontFamily: "JetBrains Mono, Fira Code, monospace",
    fontSize: 14,
    lineHeight: 22,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    padding: { top: 16, bottom: 16 },
  };



  const runPython = async () => {
    if (!isReady) {
      alert("Pyodide is not ready yet. Please wait...");
      return;
    }

    setOutput("");
    setStatus("Running Python...");

    try {
      const pyodide = pyodideRef.current;
      await pyodide.runPythonAsync(`
sys.stdout.content = ""
sys.stderr.content = ""
`);
      await pyodide.runPythonAsync(pythonCode);
      setStatus("Execution completed!");
    } catch (err) {
      setOutput((prev) => prev + `Error: ${err.message}\n`);
      setStatus("Execution failed");
    }
  };

  const clearAll = () => {
    setOutput("");
    setStatus(isReady ? "Ready to run Python!" : "Loading Pyodide...");
  };

  return (
    <div className="app-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="left-section">
          <img src="/codii_logo_trans.png" alt="Codii Logo" className="codii-logo" />
        </div>

        <div className="center-section">
          <button className="icon-btn share-btn" title="Share">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
            </svg>
            Share
          </button>

          <button
            onClick={runPython}
            disabled={!isReady}
            className={`run-btn ${!isReady ? "disabled" : ""}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2v12l10-6L3 2z" />
            </svg>
            Run
          </button>
        </div>

        <div className="right-section">
          <span className="output-label">Output</span>
          <button onClick={clearAll} className="clear-btn">
            Clear
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-content">
        {/* Left Side - Code Editor */}
        <div className="editor-section">
          <Editor
            height="100%"
            language="python"
            theme="vs-dark"
            value={pythonCode}
            onChange={(value) => setPythonCode(value || "")}
            options={editorOptions}
          />
        </div>

        {/* Right Side - Output */}
        <div className="editor-section output-section">
          <Editor
            height="100%"
            language="plaintext"
            theme="vs-dark"
            value={output}
            options={{ ...editorOptions, readOnly: true }}
          />
        </div>
      </div>
    </div>
  );
}

export default PythonCompiler;