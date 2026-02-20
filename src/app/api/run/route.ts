import { verifyApiSecurity } from "@/lib/api-security";
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const runtime = "nodejs";

type RunLanguage =
  | "python"
  | "javascript"
  | "typescript"
  | "java"
  | "c"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"
  | "php"
  | "swift"
  | "kotlin"
  | "ruby"
  | "dart"
  | "r"
  | "sql"
  | "html"
  | "css"
  | "bash"
  | "powershell"
  | "scala"
  | "haskell"
  | "elixir"
  | "erlang"
  | "lua"
  | "matlab"
  | "objectivec"
  | "vbnet"
  | "vba"
  | "fsharp"
  | "perl"
  | "groovy"
  | "clojure"
  | "julia"
  | "assembly"
  | "cobol"
  | "fortran"
  | "ada"
  | "lisp"
  | "prolog"
  | "scratch"
  | "solidity"
  | "apex"
  | "plsql"
  | "abap"
  | "gdscript"
  | "qsharp"
  | "nim"
  | "crystal"
  | "rescript";

type Candidate = {
  command: string;
  args: string[];
};

type ExecutionResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  notFound: boolean;
};

type LanguageSpec =
  | {
      kind: "direct";
      ext: string;
      candidates: Candidate[];
      filename?: string;
    }
  | {
      kind: "compile";
      ext: string;
      compile: Candidate[];
      run: Candidate[];
      filename?: string;
    }
  | {
      kind: "unsupported";
      ext: string;
      reason: string;
      filename?: string;
    };

const MAX_OUTPUT = 200_000;
const EXEC_TIMEOUT_MS = 15_000;

const LANGUAGE_SPECS: Record<RunLanguage, LanguageSpec> = {
  python: {
    kind: "direct",
    ext: "py",
    candidates: [
      { command: "python", args: ["{file}"] },
      { command: "py", args: ["-3", "{file}"] }
    ]
  },
  javascript: {
    kind: "direct",
    ext: "js",
    candidates: [{ command: "node", args: ["{file}"] }]
  },
  typescript: {
    kind: "direct",
    ext: "ts",
    candidates: [
      { command: "tsx", args: ["{file}"] },
      { command: "ts-node", args: ["{file}"] },
      { command: "deno", args: ["run", "--allow-all", "{file}"] }
    ]
  },
  java: {
    kind: "compile",
    ext: "java",
    filename: "Main.java",
    compile: [{ command: "javac", args: ["{file}"] }],
    run: [{ command: "java", args: ["-cp", "{dir}", "Main"] }]
  },
  c: {
    kind: "compile",
    ext: "c",
    filename: "main.c",
    compile: [
      { command: "gcc", args: ["{file}", "-O2", "-o", "{exe}"] },
      { command: "clang", args: ["{file}", "-O2", "-o", "{exe}"] }
    ],
    run: [{ command: "{exe}", args: [] }]
  },
  cpp: {
    kind: "compile",
    ext: "cpp",
    filename: "main.cpp",
    compile: [
      { command: "g++", args: ["{file}", "-O2", "-std=c++17", "-o", "{exe}"] },
      { command: "clang++", args: ["{file}", "-O2", "-std=c++17", "-o", "{exe}"] }
    ],
    run: [{ command: "{exe}", args: [] }]
  },
  csharp: {
    kind: "compile",
    ext: "cs",
    filename: "Program.cs",
    compile: [
      { command: "csc", args: ["/nologo", "/out:{exe}.exe", "{file}"] },
      { command: "mcs", args: ["-out:{exe}.exe", "{file}"] }
    ],
    run: [
      { command: "{exe}.exe", args: [] },
      { command: "dotnet", args: ["{exe}.exe"] }
    ]
  },
  go: {
    kind: "compile",
    ext: "go",
    filename: "main.go",
    compile: [{ command: "go", args: ["build", "-o", "{exe}", "{file}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  rust: {
    kind: "compile",
    ext: "rs",
    filename: "main.rs",
    compile: [{ command: "rustc", args: ["{file}", "-O", "-o", "{exe}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  php: {
    kind: "direct",
    ext: "php",
    candidates: [{ command: "php", args: ["{file}"] }]
  },
  swift: {
    kind: "direct",
    ext: "swift",
    candidates: [{ command: "swift", args: ["{file}"] }]
  },
  kotlin: {
    kind: "direct",
    ext: "kt",
    candidates: [{ command: "kotlinc", args: ["-script", "{file}"] }]
  },
  ruby: {
    kind: "direct",
    ext: "rb",
    candidates: [{ command: "ruby", args: ["{file}"] }]
  },
  dart: {
    kind: "direct",
    ext: "dart",
    candidates: [{ command: "dart", args: ["run", "{file}"] }]
  },
  r: {
    kind: "direct",
    ext: "r",
    candidates: [
      { command: "Rscript", args: ["{file}"] },
      { command: "R", args: ["--vanilla", "-f", "{file}"] }
    ]
  },
  sql: {
    kind: "unsupported",
    ext: "sql",
    reason: "SQL needs a concrete DB engine/connection."
  },
  html: {
    kind: "unsupported",
    ext: "html",
    reason: "HTML is markup and not directly executable by this runner."
  },
  css: {
    kind: "unsupported",
    ext: "css",
    reason: "CSS is stylesheet code and not directly executable by this runner."
  },
  bash: {
    kind: "direct",
    ext: "sh",
    candidates: [{ command: "bash", args: ["{file}"] }]
  },
  powershell: {
    kind: "direct",
    ext: "ps1",
    candidates: [
      { command: "pwsh", args: ["-File", "{file}"] },
      { command: "powershell", args: ["-ExecutionPolicy", "Bypass", "-File", "{file}"] }
    ]
  },
  scala: {
    kind: "direct",
    ext: "scala",
    candidates: [{ command: "scala", args: ["{file}"] }]
  },
  haskell: {
    kind: "direct",
    ext: "hs",
    candidates: [{ command: "runghc", args: ["{file}"] }]
  },
  elixir: {
    kind: "direct",
    ext: "exs",
    candidates: [{ command: "elixir", args: ["{file}"] }]
  },
  erlang: {
    kind: "direct",
    ext: "erl",
    candidates: [{ command: "escript", args: ["{file}"] }]
  },
  lua: {
    kind: "direct",
    ext: "lua",
    candidates: [{ command: "lua", args: ["{file}"] }]
  },
  matlab: {
    kind: "direct",
    ext: "m",
    candidates: [{ command: "octave", args: ["--silent", "{file}"] }]
  },
  objectivec: {
    kind: "compile",
    ext: "m",
    filename: "main.m",
    compile: [{ command: "clang", args: ["{file}", "-o", "{exe}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  vbnet: {
    kind: "compile",
    ext: "vb",
    filename: "Program.vb",
    compile: [{ command: "vbc", args: ["/nologo", "/out:{exe}.exe", "{file}"] }],
    run: [{ command: "{exe}.exe", args: [] }]
  },
  vba: {
    kind: "unsupported",
    ext: "vba",
    reason: "VBA requires an Office host application (Excel/Word)."
  },
  fsharp: {
    kind: "direct",
    ext: "fsx",
    candidates: [{ command: "dotnet", args: ["fsi", "{file}"] }]
  },
  perl: {
    kind: "direct",
    ext: "pl",
    candidates: [{ command: "perl", args: ["{file}"] }]
  },
  groovy: {
    kind: "direct",
    ext: "groovy",
    candidates: [{ command: "groovy", args: ["{file}"] }]
  },
  clojure: {
    kind: "direct",
    ext: "clj",
    candidates: [
      { command: "clojure", args: ["{file}"] },
      { command: "bb", args: ["{file}"] }
    ]
  },
  julia: {
    kind: "direct",
    ext: "jl",
    candidates: [{ command: "julia", args: ["{file}"] }]
  },
  assembly: {
    kind: "unsupported",
    ext: "asm",
    reason: "Assembly needs a target architecture and linker workflow."
  },
  cobol: {
    kind: "compile",
    ext: "cob",
    filename: "main.cob",
    compile: [{ command: "cobc", args: ["-x", "{file}", "-o", "{exe}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  fortran: {
    kind: "compile",
    ext: "f90",
    filename: "main.f90",
    compile: [{ command: "gfortran", args: ["{file}", "-o", "{exe}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  ada: {
    kind: "compile",
    ext: "adb",
    filename: "main.adb",
    compile: [{ command: "gnatmake", args: ["{file}", "-o", "{exe}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  lisp: {
    kind: "direct",
    ext: "lisp",
    candidates: [
      { command: "sbcl", args: ["--script", "{file}"] },
      { command: "clisp", args: ["{file}"] }
    ]
  },
  prolog: {
    kind: "direct",
    ext: "pl",
    candidates: [{ command: "swipl", args: ["-q", "-s", "{file}", "-g", "main", "-t", "halt"] }]
  },
  scratch: {
    kind: "unsupported",
    ext: "sb3",
    reason: "Scratch projects are not text executables in this runner."
  },
  solidity: {
    kind: "unsupported",
    ext: "sol",
    reason: "Solidity needs a blockchain toolchain/runtime (solc/evm)."
  },
  apex: {
    kind: "unsupported",
    ext: "cls",
    reason: "Apex runs only inside Salesforce environments."
  },
  plsql: {
    kind: "unsupported",
    ext: "sql",
    reason: "PL/SQL needs an Oracle DB runtime." 
  },
  abap: {
    kind: "unsupported",
    ext: "abap",
    reason: "ABAP runs inside SAP systems."
  },
  gdscript: {
    kind: "direct",
    ext: "gd",
    candidates: [{ command: "godot", args: ["--headless", "--script", "{file}"] }]
  },
  qsharp: {
    kind: "direct",
    ext: "qs",
    candidates: [{ command: "dotnet", args: ["run", "{file}"] }]
  },
  nim: {
    kind: "compile",
    ext: "nim",
    filename: "main.nim",
    compile: [{ command: "nim", args: ["c", "-o:{exe}", "{file}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  crystal: {
    kind: "compile",
    ext: "cr",
    filename: "main.cr",
    compile: [{ command: "crystal", args: ["build", "{file}", "-o", "{exe}"] }],
    run: [{ command: "{exe}", args: [] }]
  },
  rescript: {
    kind: "unsupported",
    ext: "res",
    reason: "ReasonML/ReScript needs a project compiler toolchain."
  }
};

function applyVars(value: string, vars: Record<string, string>) {
  return value.replace(/\{(file|exe|dir)\}/g, (_, key: keyof typeof vars) => vars[key]);
}

function materialize(candidate: Candidate, vars: Record<string, string>): Candidate {
  return {
    command: applyVars(candidate.command, vars),
    args: candidate.args.map((arg) => applyVars(arg, vars))
  };
}

function runCommand(candidate: Candidate) {
  return new Promise<ExecutionResult>((resolve) => {
    const child = spawn(candidate.command, candidate.args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let finished = false;
    let timedOut = false;
    let notFound = false;

    const done = (exitCode: number) => {
      if (finished) {
        return;
      }
      finished = true;
      resolve({
        exitCode,
        stdout,
        stderr,
        timedOut,
        notFound
      });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, EXEC_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < MAX_OUTPUT) {
        stdout += chunk.toString("utf8");
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_OUTPUT) {
        stderr += chunk.toString("utf8");
      }
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (error.code === "ENOENT") {
        notFound = true;
        done(127);
        return;
      }
      stderr += error.message;
      done(1);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      done(code ?? 0);
    });
  });
}

async function runCandidates(candidates: Candidate[], vars: Record<string, string>) {
  let last: ExecutionResult = {
    exitCode: 127,
    stdout: "",
    stderr: "",
    timedOut: false,
    notFound: true
  };

  for (const candidate of candidates) {
    const result = await runCommand(materialize(candidate, vars));
    last = result;
    if (!result.notFound) {
      break;
    }
  }

  return last;
}

function isValidLanguage(value: string): value is RunLanguage {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_SPECS, value);
}

export async function POST(request: NextRequest) {
  const security = verifyApiSecurity(request);
  if (!security.ok) {
    return NextResponse.json({ error: security.error }, { status: security.status });
  }

  const body = await request.json();
  const code = typeof body?.code === "string" ? body.code : "";
  const languageInput = typeof body?.language === "string" ? body.language : "";

  if (!code.trim()) {
    return NextResponse.json({ error: "Code is empty." }, { status: 400 });
  }

  if (!isValidLanguage(languageInput)) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }

  const language = languageInput;
  const spec = LANGUAGE_SPECS[language];

  if (spec.kind === "unsupported") {
    return NextResponse.json(
      {
        ok: false,
        exitCode: 2,
        timedOut: false,
        stdout: "",
        stderr: spec.reason,
        error: spec.reason
      },
      { status: 400 }
    );
  }

  const runDir = path.join(tmpdir(), `pair-run-${randomUUID()}`);
  await fs.mkdir(runDir, { recursive: true });

  const fileName = spec.filename ?? `main.${spec.ext}`;
  const filePath = path.join(runDir, fileName);
  const exePath = path.join(runDir, process.platform === "win32" ? "program.exe" : "program");
  const vars = {
    file: filePath,
    exe: exePath,
    dir: runDir
  };

  await fs.writeFile(filePath, code, "utf8");

  try {
    if (spec.kind === "direct") {
      const result = await runCandidates(spec.candidates, vars);

      if (result.notFound) {
        return NextResponse.json(
          {
            ok: false,
            error: `No installed runtime found for ${language}.`,
            exitCode: 127,
            timedOut: false,
            stdout: "",
            stderr: ""
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: result.exitCode === 0 && !result.timedOut,
        exitCode: result.exitCode,
        timedOut: result.timedOut,
        stdout: result.stdout,
        stderr: result.stderr
      });
    }

    const compileResult = await runCandidates(spec.compile, vars);

    if (compileResult.notFound) {
      return NextResponse.json(
        {
          ok: false,
          error: `No installed compiler found for ${language}.`,
          exitCode: 127,
          timedOut: false,
          stdout: compileResult.stdout,
          stderr: compileResult.stderr
        },
        { status: 400 }
      );
    }

    if (compileResult.exitCode !== 0 || compileResult.timedOut) {
      return NextResponse.json({
        ok: false,
        exitCode: compileResult.exitCode,
        timedOut: compileResult.timedOut,
        stdout: compileResult.stdout,
        stderr: compileResult.stderr
      });
    }

    const runResult = await runCandidates(spec.run, vars);

    if (runResult.notFound) {
      return NextResponse.json(
        {
          ok: false,
          error: `Compiled ${language}, but executable runtime is missing.`,
          exitCode: 127,
          timedOut: false,
          stdout: runResult.stdout,
          stderr: runResult.stderr
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: runResult.exitCode === 0 && !runResult.timedOut,
      exitCode: runResult.exitCode,
      timedOut: runResult.timedOut,
      stdout: runResult.stdout,
      stderr: runResult.stderr
    });
  } finally {
    await fs.rm(runDir, { recursive: true, force: true }).catch(() => {});
  }
}
