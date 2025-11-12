import React, { useRef, useState, useEffect } from "react";
import Editor from "@monaco-editor/react";

function JsCompiler() {
  const [code, setCode] = useState(`// Codeforces Problem A: Team
const fs = require('fs');
const data = fs.readFileSync(0, 'utf8').trim().split('\\n');

const n = parseInt(data[0]);
let count = 0;

for (let i = 1; i <= n; i++) {
  const nums = data[i].split(' ').map(Number);
  const sure = nums.reduce((a, b) => a + b, 0);
  if (sure >= 2) count++;
}

console.log(count);

`);
  const [userInput, setUserInput] = useState("3\n1 1 0\n1 1 1\n1 0 0");
  const [expectedOutput, setExpectedOutput] = useState("2");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("Ready");
  const [verdict, setVerdict] = useState(null);
  const [showLoader, setShowLoader] = useState(true);

  const iframeRef = useRef(null);
  const handlerRef = useRef(null);
  const outputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowLoader(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Utility to append output + auto-scroll
  const appendOutput = (text) => {
    setOutput((prev) => {
      const next = prev + text;
      setTimeout(() => {
        if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }, 0);
      return next;
    });
  };

  // Transform some common Node fs usage into __readStdin() calls and shim require('fs')
  function transformNodeStyleCode(userCode) {
    let transformed = userCode;

    // Replace require('fs') declarations with a shim object
    transformed = transformed.replace(
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]fs['"]\s*\)\s*;?/g,
      (m, varName) => {
        return `const ${varName} = { readFileSync: ()=>__readStdin() };`;
      }
    );

    // Replace inline require('fs').readFileSync(0,'utf8') usages
    transformed = transformed.replace(
      /require\(\s*['"]fs['"]\s*\)\s*\.readFileSync\s*\(\s*0\s*(?:,\s*['"]utf-?8['"]\s*)?\)/g,
      "__readStdin()"
    );

    // Replace fs.readFileSync(0, 'utf8') occurrences
    transformed = transformed.replace(
      /\b([A-Za-z_$][\w$]*)\.readFileSync\s*\(\s*0\s*(?:,\s*['"]utf-?8['"]\s*)?\)/g,
      "__readStdin()"
    );

    // Replace bare require('fs') usages with shim object
    transformed = transformed.replace(/require\(\s*['"]fs['"]\s*\)/g, "{ readFileSync: ()=>__readStdin() }");

    // If users used process.stdin streaming style, we provide a simple shim in the iframe; no transform needed.
    return transformed;
  }

  const runJs = () => {
    setStatus("Running JavaScript...");
    setOutput("");
    setVerdict(null);

    // Cleanup prior iframe & handler
    if (iframeRef.current) {
      try { document.body.removeChild(iframeRef.current); } catch (e) {}
      iframeRef.current = null;
    }
    if (handlerRef.current) {
      window.removeEventListener("message", handlerRef.current);
      handlerRef.current = null;
    }

    const inputs = userInput.replace(/\r/g, "").split("\n");
    const transformedCode = transformNodeStyleCode(code);

    // Iframe HTML with helpers:
    // - forwards console.log/error to parent
    // - defines __readStdin() and input(prompt)
    // - provides a basic process.stdin shim that triggers data/end handlers
    // - posts a 'done' message when execution finishes (so parent can run verdict)
    const iframeHtml = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<script>
(function(){
  function forward(type, text) {
    parent.postMessage({ type: type, data: String(text) }, "*");
  }

  // minimal console wrapper
  window.console = {
    log: (...args) => forward('log', args.join(' ')),
    error: (...args) => forward('error', args.join(' ')),
    warn: (...args) => forward('log', args.join(' '))
  };

  let __inputs = [];
  let __idx = 0;

  function __readStdin() {
    return __inputs.join('\\n');
  }

  function input(promptText) {
    const hasPrompt = (typeof promptText === 'string' && promptText.length > 0);
    if (hasPrompt) console.log(promptText);
    const val = (__idx < __inputs.length) ? __inputs[__idx++] : undefined;
    if (hasPrompt) console.log((val === undefined) ? "[No Input Provided]" : String(val));
    if (val === undefined) throw new Error('No more input provided!');
    return val;
  }

  // simple process.stdin shim to support code using process.stdin.on('data', ...)
  const process = {
    stdin: {
      on: function(evt, cb) {
        try {
          if (evt === 'data') cb(__readStdin());
          if (evt === 'end') cb();
        } catch (e) { /* ignore */ }
      },
      setEncoding: function() {}
    }
  };

  window.__readStdin = __readStdin;
  window.input = input;
  window.process = process;

  window.addEventListener('message', function(ev) {
    try {
      const payload = ev.data || {};
      if (!payload.code) return;
      __inputs = Array.isArray(payload.inputs) ? payload.inputs.slice() : [];
      __idx = 0;

      try {
        (function(){
          eval(payload.code);
        })();
      } catch (execErr) {
        console.error(execErr && execErr.message ? execErr.message : String(execErr));
      } finally {
        // notify parent that execution finished (gives parent chance to compute verdict)
        parent.postMessage({ type: 'done' }, "*");
      }
    } catch (outer) {
      console.error(outer && outer.message ? outer.message : String(outer));
      parent.postMessage({ type: 'done' }, "*");
    }
  });
})();
<\/script>
</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.sandbox = "allow-scripts";
    iframe.style.display = "none";
    iframe.srcdoc = iframeHtml;
    document.body.appendChild(iframe);
    iframeRef.current = iframe;

    // message handler
// message handler
const handleMessage = (event) => {
  const d = event.data || {};
  if (d.type === "log") {
    appendOutput(d.data + "\n");
  } else if (d.type === "error") {
    appendOutput("Error: " + d.data + "\n");
  } else if (d.type === "done") {
    // Execution finished — compare with expectedOutput if provided
    setStatus("Execution finished");

    if (expectedOutput && expectedOutput.trim().length > 0) {
      // wait a tick so appendOutput/setOutput flush to DOM
      setTimeout(() => {
        // read actual output from DOM textarea to avoid stale-closure problems
        const actualRaw = outputRef.current ? outputRef.current.value : output;
        const expectedRaw = expectedOutput;

        // normalize both sides: remove CRs, trim trailing spaces per line, remove trailing blank lines
        const normalize = (s) =>
          (s ?? "")
            .replace(/\r/g, "")
            .split("\n")
            .map(line => line.replace(/[ \t]+$/g, "")) // trim trailing spaces/tabs
            .join("\n")
            .replace(/\n+$/g, "") // remove trailing blank lines
            .trim();

        const actual = normalize(actualRaw);
        const expected = normalize(expectedRaw);

        if (actual === expected) {
          setVerdict({ ok: true, message: "Passed" });
        } else {
          setVerdict({ ok: false, message: "Failed" });
        }
      }, 0);
    } else {
      setVerdict(null);
    }
  }
};


    handlerRef.current = handleMessage;
    window.addEventListener("message", handleMessage);

    // small delay then send code+inputs
    setTimeout(() => {
      try {
        iframe.contentWindow.postMessage({ code: transformedCode, inputs }, "*");
      } catch (e) {
        appendOutput("Error: could not post message to iframe\n");
        setStatus("Execution failed");
      }
    }, 50);
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (iframeRef.current) {
        try { document.body.removeChild(iframeRef.current); } catch (e) {}
        iframeRef.current = null;
      }
      if (handlerRef.current) {
        window.removeEventListener("message", handlerRef.current);
        handlerRef.current = null;
      }
    };
  }, []);

  const clearAll = () => {
    setOutput("");
    setExpectedOutput("");
    setUserInput("");
    setVerdict(null);
    setStatus("Ready");
  };

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

  if (showLoader) {
    return (
      <div className="codii-loader-container">
        <img src="/codii_logo_trans.png" alt="Codii Logo" className="codii-loader-logo" />
        <div className="codii-progress-bar"><div className="codii-progress-fill" /></div>
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
          <button onClick={runJs} className="run-btn">▶ Run</button>
        </div>

        <div className="right-section">
          <span className="output-label">Output</span>
          <button onClick={clearAll} className="clear-btn">Clear</button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-content">
        <div className="editor-section" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={editorOptions}
            />
          </div>
        </div>

        <div className="editor-section output-section" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
     

          <div className="" style={{display:"flex"}}> 
     {/* Input */}
             <div style={{ height: "45vh",width:"50%", borderTop: "1px solid rgba(255,87,68,0.08)",borderRight:"3px solid rgba(255,87,68,0.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,87,68,0.03)" }}><strong>Input</strong></div>
            <textarea
              placeholder="Enter input here (one line per input). Use input('prompt') or Node-style fs.readFileSync(0,'utf8')."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              style={{
                width: "100%", height: "100%", background: "#0f0f0f", color: "#e6e6e6",
                border: "none", padding: "12px", fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px", resize: "none", outline: "none", overflow: "auto"
              }}
            />
            
          </div>

                      {/* Expected Output */}
          <div style={{ height: "45vh",width:"50%", borderTop: "1px solid rgba(255,87,68,0.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,87,68,0.03)" }}><strong>Expected Output (Optional)</strong></div>
            <textarea
              placeholder="Optional: Enter expected output to auto-verify."
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              style={{
                width: "100%", height: "100%", background: "#0f0f0f", color: "#e6e6e6",
                border: "none", padding: "12px", fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px", resize: "none", outline: "none", overflow: "auto"
              }}
            />
          </div>
          </div>
         



          {/* Output */}
          <div style={{ height: "50vh", borderTop: "1px solid rgba(255,87,68,0.08)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(255,87,68,0.03)", display: "flex", justifyContent: "space-between" }}>
              <strong>Output</strong>
              {/* <span style={{ fontSize: 12, color: "#e0e0e0" }}>{status}</span> */}
            </div>
            <textarea
              ref={outputRef}
              readOnly
              value={output}
              style={{
                width: "100%", height: "100%", background: "#0b0b0b", color: "#9fffa3",
                border: "none", padding: "12px", fontFamily: "JetBrains Mono, monospace",
                fontSize: "13px", resize: "none", outline: "none", overflow: "auto", whiteSpace: "pre"
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

export default JsCompiler;
