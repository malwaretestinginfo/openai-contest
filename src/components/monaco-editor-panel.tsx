"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Monaco } from "@monaco-editor/react";
import { getYjsProviderForRoom } from "@liveblocks/yjs";
import { useRoom } from "@liveblocks/react/suspense";
import type { editor as MonacoEditorType, IDisposable, languages } from "monaco-editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false
});

type LuaSuggestion = Record<string, unknown> & { __children__?: unknown };
type CompletionKindName =
  | "Class"
  | "Color"
  | "Constructor"
  | "Enum"
  | "Field"
  | "File"
  | "Folder"
  | "Function"
  | "Interface"
  | "Keyword"
  | "Method"
  | "Module"
  | "Property"
  | "Reference"
  | "Snippet"
  | "Text"
  | "Unit"
  | "Value"
  | "Variable";

type MonacoEditorPanelProps = {
  language?: string;
  onCursorChange?: (payload: { lineNumber: number; column: number }) => void;
  onEditorBlur?: () => void;
  onReady?: (api: {
    getText: () => string;
    setText: (text: string) => void;
    addRawSnippet: (data: LuaSuggestion) => void;
    addSnippet: (
      kindName: keyof typeof languages.CompletionItemKind,
      snippetName: string,
      data: Record<string, unknown>
    ) => void;
    addIntellisense: (label: string, kind: string, detail: string, insertText: string) => void;
  }) => void;
};

const proposals: LuaSuggestion[] = [];
let completionProvider: IDisposable | null = null;
let isThemeDefined = false;

function getDependencyProposals() {
  return proposals.map((proposal) => {
    const { __children__, ...cleaned } = proposal;
    return cleaned;
  });
}

function defineDarkTheme(monaco: Monaco) {
  if (isThemeDefined) {
    return;
  }

  monaco.editor.defineTheme("Dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "variable.language.self", foreground: "a9a0a0" },
      { token: "variable.parameter.variadic", foreground: "a9a0a0" },
      { token: "variable.parameter.function", foreground: "a9a0a0" },
      { token: "variable.other.constant", foreground: "93f482" },
      { token: "variable.property", foreground: "f2a04f" },
      { token: "variable.object.property", foreground: "f24f4f" },
      { token: "keyword", foreground: "4cc2f7" },
      { token: "keyword.local", foreground: "cd3255", fontStyle: "bold" },
      { token: "keyword.operator", foreground: "4cc2f7" },
      { token: "keyword.operator.type.annotation", foreground: "4cc2f7" },
      { token: "keyword.operator.typedef.annotation", foreground: "4cc2f7" },
      { token: "keyword.control.export", foreground: "f75e4c", fontStyle: "bold" },
      { token: "operator", foreground: "c6fc5e" },
      { token: "operator.type", foreground: "5e90fc" },
      { token: "operator.special", foreground: "fcfa5e" },
      { token: "entity.name.type.alias", foreground: "ffffff" },
      { token: "entity.name.function", foreground: "f96161" },
      { token: "global", foreground: "61afef", fontStyle: "bold" },
      { token: "storage.type", foreground: "ffffff" },
      { token: "comment", foreground: "abb2bf", fontStyle: "bold" },
      { token: "comment.highlight.title", foreground: "9ea3ac", fontStyle: "bold" },
      { token: "comment.highlight.name", foreground: "9ea3ac", fontStyle: "bold" },
      { token: "comment.delimiter.modifier", foreground: "abb2bf", fontStyle: "bold" },
      { token: "comment.highlight.modifier", foreground: "94979c", fontStyle: "bold" },
      { token: "comment.highlight.descriptor", foreground: "94979c", fontStyle: "bold" },
      { token: "delimiter.longstring", foreground: "c4cbd0" },
      { token: "delimiter.bracket", foreground: "c4cbd0" },
      { token: "delimiter.array", foreground: "c4cbd0" },
      { token: "delimiter.parenthesis", foreground: "c4cbd0" },
      { token: "delimiter", foreground: "c4cbd0" },
      { token: "string", foreground: "63f499" },
      { token: "longstring", foreground: "63f499" },
      { token: "string.delimeter", foreground: "63f499" },
      { token: "string.escape", foreground: "63f499" },
      { token: "punctuation.separator.arguments", foreground: "ffffff" },
      { token: "punctuation.separator.parameter", foreground: "ffffff" },
      { token: "punctuation.separator.table", foreground: "ffffff" },
      { token: "punctuation.definition.block", foreground: "ffffff" },
      { token: "punctuation.definition.parameters", foreground: "ffffff" },
      { token: "punctuation.definition.typeparameters", foreground: "ffffff" },
      { token: "constant.language", foreground: "a2d4fb" },
      { token: "number", foreground: "e5c07b" },
      { token: "constants", foreground: "a2d4fb" },
      { token: "support.function", foreground: "99dbfb" },
      { token: "support.function.library", foreground: "99dbfb" },
      { token: "support.type", foreground: "99dbfb" }
    ],
    colors: {
      "editor.background": "#00FFFF00",
      "minimap.background": "#17191D"
    }
  });

  isThemeDefined = true;
}

export default function MonacoEditorPanel({ onReady, language = "lua", onCursorChange, onEditorBlur }: MonacoEditorPanelProps) {
  const room = useRoom();
  const editorRef = useRef<MonacoEditorType.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [editorReady, setEditorReady] = useState(false);

  const getCompletionKind = useCallback((kind: string) => {
    const monaco = monacoRef.current;
    if (!monaco) {
      return null;
    }

    switch (kind as CompletionKindName) {
      case "Class":
        return monaco.languages.CompletionItemKind.Class;
      case "Color":
        return monaco.languages.CompletionItemKind.Color;
      case "Constructor":
        return monaco.languages.CompletionItemKind.Constructor;
      case "Enum":
        return monaco.languages.CompletionItemKind.Enum;
      case "Field":
        return monaco.languages.CompletionItemKind.Field;
      case "File":
        return monaco.languages.CompletionItemKind.File;
      case "Folder":
        return monaco.languages.CompletionItemKind.Folder;
      case "Function":
        return monaco.languages.CompletionItemKind.Function;
      case "Interface":
        return monaco.languages.CompletionItemKind.Interface;
      case "Keyword":
        return monaco.languages.CompletionItemKind.Keyword;
      case "Method":
        return monaco.languages.CompletionItemKind.Method;
      case "Module":
        return monaco.languages.CompletionItemKind.Module;
      case "Property":
        return monaco.languages.CompletionItemKind.Property;
      case "Reference":
        return monaco.languages.CompletionItemKind.Reference;
      case "Snippet":
        return monaco.languages.CompletionItemKind.Snippet;
      case "Text":
        return monaco.languages.CompletionItemKind.Text;
      case "Unit":
        return monaco.languages.CompletionItemKind.Unit;
      case "Value":
        return monaco.languages.CompletionItemKind.Value;
      case "Variable":
        return monaco.languages.CompletionItemKind.Variable;
      default:
        return monaco.languages.CompletionItemKind.Text;
    }
  }, []);

  const editorOptions: MonacoEditorType.IStandaloneEditorConstructionOptions = useMemo(
    () => ({
      theme: "Dark",
      fontSize: 14,
      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
      folding: true,
      dragAndDrop: true,
      links: true,
      scrollbar: { vertical: "visible" },
      minimap: { enabled: false },
      showFoldingControls: "always",
      smoothScrolling: true,
      stopRenderingLineAfter: 6500,
      fixedOverflowWidgets: false,
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      foldingHighlight: false,
      fontLigatures: true,
      formatOnPaste: true,
      showDeprecated: true,
      suggest: { snippetsPreventQuickSuggestions: false },
      padding: { top: 14 }
    }),
    []
  );

  const beforeMount = useCallback((monaco: Monaco) => {
    defineDarkTheme(monaco);

    if (!completionProvider) {
      completionProvider = monaco.languages.registerCompletionItemProvider("lua", {
        provideCompletionItems: () => ({
          suggestions: getDependencyProposals()
        }),
        triggerCharacters: [".", ":", "\""]
      });
    }
  }, []);

  const onMount = useCallback((editor: MonacoEditorType.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.getModel()?.updateOptions({ insertSpaces: false });
    editor.onDidChangeCursorPosition((event) => {
      onCursorChange?.({
        lineNumber: event.position.lineNumber,
        column: event.position.column
      });
    });
    editor.onDidBlurEditorText(() => {
      onEditorBlur?.();
    });
    setEditorReady(true);
  }, [onCursorChange, onEditorBlur]);

  const addRawSnippet = useCallback((data: LuaSuggestion) => {
    proposals.push(data);
  }, []);

  const getText = useCallback(() => {
    const model = editorRef.current?.getModel();
    return model?.getValue() ?? "";
  }, []);

  const setText = useCallback((text: string) => {
    const model = editorRef.current?.getModel();
    if (!model) {
      return;
    }
    model.setValue(text);
  }, []);

  const addSnippet = useCallback(
    (
      kindName: keyof typeof languages.CompletionItemKind,
      snippetName: string,
      data: Record<string, unknown>
    ) => {
      const monaco = monacoRef.current;
      if (!monaco) {
        return;
      }

      const snippet: LuaSuggestion = {
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind[kindName],
        label: snippetName,
        insertText: snippetName
      };

      for (const [key, value] of Object.entries(data)) {
        if (key === "insertText" && Array.isArray(value)) {
          snippet[key] = value.join("\n");
          continue;
        }
        snippet[key] = value;
      }

      proposals.push(snippet);
    },
    []
  );

  const addIntellisense = useCallback(
    (label: string, kind: string, detail: string, insertText: string) => {
      const completionKind = getCompletionKind(kind);
      if (!completionKind) {
        return;
      }

      proposals.push({
        label,
        kind: completionKind,
        detail,
        insertText
      });
    },
    [getCompletionKind]
  );

  useEffect(() => {
    if (!onReady) {
      return;
    }

    onReady({
      getText,
      setText,
      addRawSnippet,
      addSnippet,
      addIntellisense
    });
  }, [addIntellisense, addRawSnippet, addSnippet, getText, onReady, setText]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    const yProvider = getYjsProviderForRoom(room);
    const yText = yProvider.getYDoc().getText("monaco");
    let disposed = false;
    let activeBinding: { destroy: () => void } | null = null;
    let disposable: IDisposable | null = null;

    (async () => {
      const { MonacoBinding } = await import("y-monaco");
      if (disposed) {
        return;
      }

      activeBinding = new MonacoBinding(yText, model, new Set([editor]), yProvider.awareness as never);
      disposable = editor.onDidChangeModel(() => {
        const nextModel = editor.getModel();
        if (!nextModel) {
          return;
        }
        activeBinding?.destroy();
        activeBinding = new MonacoBinding(yText, nextModel, new Set([editor]), yProvider.awareness as never);
      });
    })();

    return () => {
      disposed = true;
      disposable?.dispose();
      activeBinding?.destroy();
    };
  }, [editorReady, room]);

  return (
    <MonacoEditor
      beforeMount={beforeMount}
      defaultLanguage={language}
      defaultValue=""
      language={language}
      onMount={onMount}
      options={editorOptions}
      theme="Dark"
    />
  );
}
