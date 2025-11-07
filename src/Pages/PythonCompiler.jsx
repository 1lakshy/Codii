import React, { useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";

function PythonCompiler() {
  const [pythonCode, setPythonCode] = useState(`print("Hello from Python in the browser!")
`);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Loading Pyodide...");
  const [isReady, setIsReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true); // 👈 loader state
  const pyodideRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadPyodideEnv = async () => {
      setStatus("Loading Pyodide...");
      try {
        if (!window.loadPyodide) {
          await import("https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js");
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
        });
        pyodideRef.current = pyodide;

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
        setIsReady(true);
      } catch (err) {
        setStatus("Error loading Pyodide");
      }
    };

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
  let cleanedError = err.message || err.toString();

  // ✅ If the error contains a long traceback, keep only the last few relevant lines
  if (cleanedError.includes("Traceback")) {
    const lines = cleanedError.split("\n");

    // Find where user code starts (usually '<exec>' or 'File "<exec>"')
    const startIndex = lines.findIndex(line => line.includes('File "<exec>"'));
    if (startIndex !== -1) {
      cleanedError = lines.slice(startIndex).join("\n"); // Keep only the useful traceback part
    } else {
      // fallback: show last few lines if "<exec>" not found
      cleanedError = lines.slice(-5).join("\n");
    }
  }

  setOutput((prev) => prev + `${cleanedError}\n`);
  setStatus("Execution failed");
}

  };

  const clearAll = () => {
    setOutput("");
    setStatus(isReady ? "Ready to run Python!" : "Loading Pyodide...");
  };

  // ⏳ Show loading animation first
if (showLoader) {
  return (
    <div className="codii-loader-container">
      <img src="/codii_logo_trans.png" alt="Codii Logo" className="codii-loader-logo" />
      <div className="codii-progress-bar">
        <div className="codii-progress-fill"></div>
      </div>
      <div className="codii-loader-text">Initializing your coding space...</div>
    </div>
  );
}

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
              <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z" />
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
