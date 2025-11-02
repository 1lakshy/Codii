import React, { useRef, useState, useEffect } from "react";
import Editor from "@monaco-editor/react";


function JsCompiler() {
  const [code, setCode] = useState(`
// Example JS program
console.log("Hello from JavaScript in the browser!");

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci(10) =", fibonacci(10));
  `);

  const [output, setOutput] = useState("");
  const iframeRef = useRef(null);
  const [status, setStatus] = useState("Ready to run JavaScript!");

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

  // Create iframe sandbox for code execution
  const createIframe = () => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox = "allow-scripts";
    document.body.appendChild(iframe);
    return iframe;
  };

const runJs = () => {
  setStatus("Running JavaScript...");
  setOutput("");

  // Remove previous iframe
  if (iframeRef.current) document.body.removeChild(iframeRef.current);

  // Create sandboxed iframe with inline HTML
  const iframe = document.createElement("iframe");
  iframe.sandbox = "allow-scripts";
  iframe.style.display = "none";

  // Script that runs inside the iframe
  const iframeContent = `
    <script>
      window.addEventListener('message', (event) => {
        try {
          const code = event.data;
          const log = (...args) => parent.postMessage({ type: 'log', data: args.join(' ') }, '*');
          const error = (...args) => parent.postMessage({ type: 'error', data: args.join(' ') }, '*');

          console.log = log;
          console.error = error;

          try {
            eval(code);
          } catch (err) {
            error(err);
          }
        } catch (err) {
          parent.postMessage({ type: 'error', data: err.message }, '*');
        }
      });
    </script>
  `;

  // Inject the script via srcdoc (same-origin)
  iframe.srcdoc = iframeContent;
  document.body.appendChild(iframe);
  iframeRef.current = iframe;

  // Listen for logs from iframe
  window.addEventListener("message", (event) => {
    if (event.data.type === "log") {
      setOutput((prev) => prev + event.data.data + "\n");
    } else if (event.data.type === "error") {
      setOutput((prev) => prev + "Error: " + event.data.data + "\n");
    }
  });

  // Send code to iframe for execution
  setTimeout(() => {
    iframe.contentWindow.postMessage(code, "*");
  }, 100);

  setStatus("Execution completed!");
};


  const clearAll = () => {
    setOutput("");
    setStatus("Ready to run JavaScript!");
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

          <button onClick={runJs} className="run-btn">
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
        {/* Code Editor */}
        <div className="editor-section">
          <Editor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={editorOptions}
          />
        </div>

        {/* Output */}
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

export default JsCompiler;
