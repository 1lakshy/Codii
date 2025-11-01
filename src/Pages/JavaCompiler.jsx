import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';


function JavaCompiler() {
  const [javaCode, setJavaCode] = useState(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Codii!");
        int result = fibonacci(10);
        System.out.println("Fibonacci(10) = " + result);
    }
    
    public static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}`);
  
  const [jsOutput, setJsOutput] = useState('');
  const [consoleOutput, setConsoleOutput] = useState('');
  const [status, setStatus] = useState('Loading...');
  const [isInitialized, setIsInitialized] = useState(false);
  const [canRun, setCanRun] = useState(false);
  
  const compilerRef = useRef(null);

  const editorOptions = {
    autoIndent: 'full',
    fontFamily: 'JetBrains Mono, Fira Code, monospace',
    fontSize: 14,
    lineHeight: 22,
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    padding: { top: 16, bottom: 16 },
  };

  const addToConsole = (text) => {
    setConsoleOutput(prev => prev + text);
  };

  useEffect(() => {
    const initializeTeaVM = async () => {
      setStatus('Loading...');
      addToConsole('Setting Up Connection...\n');
      
      try {
        addToConsole('Loading WebAssembly module...\n');
        const { load } = await import('./c.js');
        const teavm = await load('/compiler.wasm');
        const compilerLib = teavm.exports;
        addToConsole('WebAssembly module loaded successfully\n');
        
        addToConsole('Creating compiler instance...\n');
        compilerRef.current = compilerLib.createCompiler();
        addToConsole('Compiler instance created\n');
        
        setStatus('Loading SDK...');
        addToConsole('Loading SDK from compile-classlib-teavm.bin...\n');
        let response = await fetch('/compile-classlib-teavm.bin');
        if (!response.ok) {
          throw new Error(`Failed to load SDK: ${response.status} ${response.statusText}`);
        }
        let arrayBuffer = await response.arrayBuffer();
        addToConsole(`SDK loaded: ${arrayBuffer.byteLength} bytes\n`);
        compilerRef.current.setSdk(new Uint8Array(arrayBuffer));
        addToConsole('SDK set successfully\n');
        
        setStatus('Loading runtime...');
        addToConsole('Loading runtime from runtime-classlib-teavm.bin...\n');
        response = await fetch('/runtime-classlib-teavm.bin');
        if (!response.ok) {
          throw new Error(`Failed to load runtime: ${response.status} ${response.statusText}`);
        }
        arrayBuffer = await response.arrayBuffer();
        addToConsole(`Runtime loaded: ${arrayBuffer.byteLength} bytes\n`);
        compilerRef.current.setTeaVMClasslib(new Uint8Array(arrayBuffer));
        addToConsole('Runtime set successfully\n');
        
        setStatus('Ready to compile!');
        addToConsole('Initialization complete! Ready to compile Java code.\n');
        setIsInitialized(true);
        
      } catch (error) {
        setStatus('Error: ' + error.message);
        addToConsole('Initialization error: ' + error.message + '\n');
        addToConsole('Stack trace: ' + error.stack + '\n');
        console.error('Initialization error:', error);
      }
    };
    
    initializeTeaVM();
  }, []);

  const compileJava = async () => {
    if (!isInitialized) {
      alert('Connection not ready yet. Please wait for initialization.');
      return;
    }
    
    const compiler = compilerRef.current;
    setStatus('Compiling...');
    setConsoleOutput('Starting compilation...\n');
    
    try {
      const diagnostics = [];
      const listener = compiler.onDiagnostic ? compiler.onDiagnostic((diagnostic) => {
        diagnostics.push(diagnostic);
        addToConsole(`[${diagnostic.severity}] ${diagnostic.fileName}:${diagnostic.lineNumber} - ${diagnostic.message}\n`);
      }) : null;
      
      compiler.clearSourceFiles();
      compiler.addSourceFile('Main.java', javaCode);
      
      addToConsole('Source file added, compiling Java...\n');
      
      const compileResult = compiler.compile();
      
      addToConsole(`Java compilation result: ${compileResult}\n`);
      
      if (compileResult) {
        addToConsole('Generating WebAssembly and trying to execute...\n');
        
        try {
          compiler.generateWebAssembly({
            outputName: "app",
            mainClass: "Main"
          });
          addToConsole('WebAssembly generation completed\n');
          let wasmBytes = null;
          let capturedOutput = '';
          try {
            wasmBytes = compiler.getWebAssemblyOutputFile("app.wasm");
            if (wasmBytes && wasmBytes.length > 0) {
              addToConsole(`WebAssembly module: ${wasmBytes.length} bytes\n`);
              
              const { load } = await import('./c.js');
              const runtime = await load(wasmBytes);
              
              addToConsole('WebAssembly module loaded successfully\n');
              
              const originalLog = console.log;
              console.log = function(...args) {
                capturedOutput += args.join(' ') + '\n';
                originalLog.apply(console, args);
              };
              
              if (runtime.exports && runtime.exports.main) {
                runtime.exports.main([]);
                addToConsole('Executed WebAssembly main method\n');
              } else {
                addToConsole('No main method found in WebAssembly exports\n');
                addToConsole('Available exports: ' + Object.keys(runtime.exports).join(', ') + '\n');
              }
              
              console.log = originalLog;
              
            } else {
              addToConsole('No WebAssembly output found\n');
            }
          } catch (wasmError) {
            addToConsole(`WebAssembly execution failed: ${wasmError.message}\n`);
          }
          
          if (capturedOutput && capturedOutput.trim() !== '') {
            setJsOutput(capturedOutput);
            setCanRun(true);
            setStatus('Compilation successful!');
          } else {
            setJsOutput(`// Compilation successful
// WebAssembly module generated and executed
// Check the Console Output section below for results`);
            setStatus('Compilation successful');
          }
          
        } catch (generateError) {
          setJsOutput('// Generation failed: ' + generateError.message);
          setStatus('Generation failed');
          addToConsole('Generation failed: ' + generateError.message + '\n');
        }
        
      } else {
        setJsOutput('// Java compilation failed');
        setStatus('Java compilation failed');
        addToConsole('Java compilation failed\n');
        
        if (diagnostics.length > 0) {
          addToConsole('\nDiagnostics:\n');
          diagnostics.forEach(d => {
            addToConsole(`${d.severity}: ${d.message}\n`);
          });
        }
      }
      
      if (listener && listener.destroy) {
        listener.destroy();
      }
      
    } catch (error) {
      setJsOutput('// Error: ' + error.message);
      setStatus('Compilation error: ' + error.message);
      addToConsole('Compilation error: ' + error.message + '\n');
      addToConsole('Stack trace: ' + error.stack + '\n');
      console.error('Compilation error:', error);
    }
  };

  const clearAll = () => {
    setJavaCode(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Codii!");
    }
}`);
    setJsOutput('');
    setConsoleOutput('');
    setCanRun(false);
    setStatus(isInitialized ? 'Ready to compile!' : 'Loading...');
  };

  return (
    <div className="app-container">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="left-section">
          <img src="/codii_logo_trans.png" alt="Codii Logo" className="codii-logo"/>
        </div>
        
        <div className="center-section">
          {/* <button className="icon-btn fullscreen-btn" title="Fullscreen">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 1a.5.5 0 0 0-.5.5v4a.5.5 0 0 1-1 0v-4A1.5 1.5 0 0 1 1.5 0h4a.5.5 0 0 1 0 1h-4zM10 .5a.5.5 0 0 1 .5-.5h4A1.5 1.5 0 0 1 16 1.5v4a.5.5 0 0 1-1 0v-4a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 1-.5-.5zM.5 10a.5.5 0 0 1 .5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 1 0 1h-4A1.5 1.5 0 0 1 0 14.5v-4a.5.5 0 0 1 .5-.5zm15 0a.5.5 0 0 1 .5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a.5.5 0 0 1 0-1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 1 .5-.5z"/>
            </svg>
          </button>
          
          <button className="icon-btn theme-btn" title="Toggle Theme">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
            </svg>
          </button> */}
          
          <button className="icon-btn share-btn" title="Share">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5z"/>
            </svg>
            Share
          </button>
          
          <button
            onClick={compileJava}
            disabled={!isInitialized}
            className={`run-btn ${!isInitialized ? 'disabled' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 2v12l10-6L3 2z"/>
            </svg>
            Run
          </button>
        </div>
        
        <div className="right-section">
          <span className="output-label">Output</span>
          <button onClick={clearAll} className="clear-btn">Clear</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Section - Java Code */}
        <div className="editor-section">
          <Editor
            height="100%"
            language="java"
            theme="vs-dark"
            value={javaCode}
            onChange={(value) => setJavaCode(value || '')}
            options={editorOptions}
          />
        </div>

        {/* Right Section - Output */}
        <div className="editor-section output-section">
          <Editor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={jsOutput}
            options={{ ...editorOptions, readOnly: true }}
          />
        </div>
      </div>
      
      {/* Status Bar */}
      {/* <div className="status-bar">
        <div className={`status-indicator ${isInitialized ? 'ready' : 'loading'}`}></div>
        <span className="status-text">{status}</span>
      </div> */}
    </div>
  );
}

export default JavaCompiler;




