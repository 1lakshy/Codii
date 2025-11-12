import React, { useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";

function PythonCompiler() {
  const outputRef = useRef(null);
  const pyodideRef = useRef(null);

  const [pythonCode, setPythonCode] = useState(
    `# Codeforces A. Team - solution for testing
n = int(input())
ans = 0
for _ in range(n):
    a, b, c = map(int, input().split())
    if a + b + c >= 2:
        ans += 1
print(ans)`
  );
  const [userInput, setUserInput] = useState("5\n1 1 0\n0 0 0\n1 1 1\n0 1 0\n1 0 1");
  const [expectedOutput, setExpectedOutput] = useState("3");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Loading Pyodide...");
  const [isReady, setIsReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [verdict, setVerdict] = useState(null); // { ok: boolean, message: string }

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
  // when execution finishes and output changes, (re)compare on the next frame
  if (status.startsWith("Execution")) {
    // wait a tick so setState has rendered to the textarea
    requestAnimationFrame(() => {
      compareWithExpected();
    });
  }
}, [status, output, expectedOutput]); // re-check if user edits expected output


  // Expose updateOutput and getNextInput to Python (via js.updateOutput and js.getNextInput)
  useEffect(() => {
    // updateOutput: append text and auto-scroll
    window.updateOutput = (text) => {
      setOutput((prev) => {
        const next = prev + text;
        // scroll to bottom on next tick
        setTimeout(() => {
          if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
          }
        }, 0);
        return next;
      });
    };
 
    
    // getNextInput: returns next line from user-provided buffer
    window.getNextInput = (prompt) => {
      const inputs = window._inputBuffer || [];
      const idx = window._inputIndex || 0;

      // Show prompt if provided
      if (prompt) {
        // ensure prompt appears immediately
        window.updateOutput(prompt);
      }

      if (idx < inputs.length) {
        const value = inputs[idx];
        window._inputIndex = idx + 1;

        // Only echo user input if a prompt was provided (matches contest behavior)
        if (prompt) {
          window.updateOutput(value + "\n");
        }
        return value;
      } else {
        if (prompt) {
          window.updateOutput("[No Input Provided]\n");
        }
        throw new Error("No more input provided!");
      }
    };

    // cleanup on unmount
    return () => {
      try {
        delete window.updateOutput;
        delete window.getNextInput;
      } catch (e) {}
    };
  }, []); // run once

  useEffect(() => {
    const loadPyodideEnv = async () => {
      setStatus("Loading Pyodide...");
      try {
        if (!window.loadPyodide) {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
          script.async = true;
          document.body.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        const pyodide = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
        });
        pyodideRef.current = pyodide;

        // wire stdout/stderr and builtins.input to JS functions we created above
        await pyodide.runPythonAsync(`
import sys, builtins, js

class JSOutput:
    def write(self, text):
        # call the JS function exposed on window (js.updateOutput)
        js.updateOutput(text)
    def flush(self):
        pass

sys.stdout = JSOutput()
sys.stderr = JSOutput()

def js_input(prompt=""):
    return js.getNextInput(prompt)

builtins.input = js_input
        `);

        setStatus("Pyodide ready!");
        setIsReady(true);
      } catch (err) {
        console.error(err);
        setStatus("Error loading Pyodide");
      }
    };

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
    padding: { top: 12, bottom: 12 },
  };

const normalize = (s) => {
  if (!s) return "";
  return s
    .replace(/\uFEFF/g, "")            // BOM
    .replace(/[\u200B-\u200D]/g, "")   // zero-widths
    .replace(/\r/g, "")                // CR
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, "")) // trim trailing spaces/tabs per line
    // remove trailing blank lines:
    .reduceRight((acc, line) => {
      if (acc.trimmed) { acc.lines.push(line); return acc; }
      if (line !== "") { acc.trimmed = true; acc.lines.push(line); }
      return acc;
    }, { lines: [], trimmed: false }).lines.reverse()
    .join("\n")
    .trim(); // final safety
};

const compareWithExpected = () => {
  if (!expectedOutput || expectedOutput.trim().length === 0) {
    setVerdict(null);
    return;
  }
  const actualRaw = outputRef.current ? outputRef.current.value : output;
  const actual = normalize(actualRaw);
  const expected = normalize(expectedOutput);
  setVerdict(
    actual === expected
      ? { ok: true, message: "Passed" }
      : { ok: false, message: "Failed" }
  );
};


  const runPython = async () => {
    if (!isReady) {
      alert("Pyodide is not ready yet. Please wait...");
      return;
    }

    setOutput("");
    setVerdict(null);
    setStatus("Running Python...");

    try {
      const pyodide = pyodideRef.current;

      // prepare input buffer (preserve empty lines)
      window._inputBuffer = userInput.replace(/\r/g, "").split("\n");
      window._inputIndex = 0;

      // clear python-side outputs (no-op but keeps things clean)
      await pyodide.runPythonAsync(`
# clear nothing: ensures JSOutput is present and nothing stale is left
sys.stdout.write("")
sys.stderr.write("")
`);

      // run the entire user program at once
      await pyodide.runPythonAsync(pythonCode);
      setStatus("Execution completed!");

      // compare with expected output if provided
      compareWithExpected();
    } catch (err) {
      let cleanedError = err.message || err.toString();

      if (cleanedError.includes("Traceback")) {
        const lines = cleanedError.split("\n");
        const startIndex = lines.findIndex((line) =>
          line.includes('File "<exec>"')
        );
        cleanedError =
          startIndex !== -1 ? lines.slice(startIndex).join("\n") : lines.slice(-6).join("\n");
      }

      setOutput((prev) => prev + `${cleanedError}\n`);
      setStatus("Execution failed");

      // still run comparison (will likely be failed if expected provided)
      setTimeout(compareWithExpected, 0);
    }
  };

  const clearAll = () => {
    setOutput("");
    setExpectedOutput("");
    setStatus(isReady ? "Ready to run Python!" : "Loading Pyodide...");
    setVerdict(null);
  };

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
          <button onClick={runPython} disabled={!isReady} className={`run-btn ${!isReady ? "disabled" : ""}`}>
            ▶ Run
          </button>
        </div>

        <div className="right-section">
          <span className="output-label">Output</span>
          <button onClick={clearAll} className="clear-btn">Clear</button>
        </div>
      </div>

      {/* Main Layout - keep two-column layout your CSS expects */}
      <div className="main-content">
        {/* Left column: Editor */}
        <div className="editor-section" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language="python"
              theme="vs-dark"
              value={pythonCode}
              onChange={(value) => setPythonCode(value || "")}
              options={editorOptions}
            />
          </div>
        </div>

        {/* Right column: Input (top), Expected Output (middle), Output (bottom) */}
        <div className="editor-section output-section" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ height: "45vh",display:"flex", borderBottom: "1px solid rgba(255,87,68,0.08)" }}>

          {/* Input */}
          <div style={{ height: "100%",width:"50%", borderRight: "4px solid rgba(255,87,68,0.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,87,68,0.03)" }}>
              <strong>Input</strong>
            </div>
            <textarea
              placeholder="Enter input here (one line per input). Only echoed if your code uses input('prompt')."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              style={{
                width: "100%",
                height: "100%",
                background: "#0f0f0f",
                color: "#e6e6e6",
                border: "none",
                padding: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                resize: "none",
                outline: "none",
                overflow: "auto",
              }}
            />
          </div>

                    {/* Expected Output */}
          <div style={{ height: "45vh",width:"50%", borderTop: "1px solid rgba(255,87,68,0.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,87,68,0.03)" }}>
              <strong>Expected Output (Optional)</strong>
            </div>
            <textarea
              placeholder="Optional: Enter expected output to auto-verify."
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              style={{
                width: "100%",
                height: "100%",
                background: "#0f0f0f",
                color: "#e6e6e6",
                border: "none",
                padding: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                resize: "none",
                outline: "none",
                overflow: "auto",
              }}
            />
          </div>
        </div>
        




          {/* Output */}
          <div style={{ height: "50vh", borderTop: "1px solid rgba(255,87,68,0.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,87,68,0.03)", display: "flex', justifyContent: 'space-between" }}>
              <strong>Output</strong>
            </div>
            <textarea
              ref={outputRef}
              readOnly
              value={output}
              style={{
                width: "100%",
                height: "100%",
                background: "#0b0b0b",
                color: "#9fffa3",
                border: "none",
                padding: "12px",
                fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px",
                resize: "none",
                outline: "none",
                overflow: "auto",
                whiteSpace: "pre",
              }}
            />
            {verdict && (
              <div style={{
                padding: "10px 12px",
                color: verdict.ok ? "#00ff88" : "#ff5744",
                fontWeight: 700,
                borderTop: "1px solid rgba(255,87,68,0.03)",
                background: "rgba(255,255,255,0.02)"
              }}>
                {verdict.message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PythonCompiler;
