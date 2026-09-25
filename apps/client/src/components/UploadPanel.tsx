import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IngestResponse, SourceKind } from "@zpl/shared-types";
import { api, ApiError } from "@/lib/api";
import { ErrorBanner, Spinner } from "@/components/ui";

type Mode = Extract<SourceKind, "text" | "youtube"> | "file";

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "text", label: "Paste text", hint: "Notes, an article, a transcript — anything you typed or copied." },
  { id: "file", label: "Upload file", hint: "PDF, DOCX, or a photo of a textbook page. Scanned PDFs work too." },
  { id: "youtube", label: "YouTube link", hint: "Any lecture with captions enabled." },
];

const ACCEPT = ".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif";
const MAX_BYTES = 20 * 1024 * 1024;

export function UploadPanel() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    (mode === "text" && text.trim().length > 120) ||
    (mode === "youtube" && url.trim().length > 8) ||
    (mode === "file" && file !== null);

  async function submit() {
    setError(null);
    setSubmitting(true);

    try {
      const body = mode === "file" ? await filePayload(file!) : textPayload(mode, text, url);
      const { packId } = await api.post<IngestResponse>("/api/ingest", body);
      navigate(`/processing/${packId}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "Something went wrong while starting your study pack.",
      );
      setSubmitting(false);
    }
  }

  function chooseFile(candidate: File | undefined) {
    if (!candidate) return;
    if (candidate.size > MAX_BYTES) {
      setError(`That file is ${(candidate.size / 1024 / 1024).toFixed(1)} MB — the limit is 20 MB.`);
      return;
    }
    setError(null);
    setFile(candidate);
    setMode("file");
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex border-b border-ink-800">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            aria-pressed={mode === item.id}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              mode === item.id
                ? "bg-ink-850 text-ink-100 shadow-[inset_0_-2px_0_0_var(--color-brand-500)]"
                : "text-ink-400 hover:text-ink-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-5">
        <p className="text-xs text-ink-400">{MODES.find((item) => item.id === mode)!.hint}</p>

        {mode === "text" && (
          <>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={9}
              placeholder="Paste your lecture notes, chapter, or transcript here…"
              className="input resize-y font-mono text-[13px] leading-relaxed"
            />
            <p className="text-right text-xs text-ink-400">
              {text.trim().length.toLocaleString()} characters
              {text.trim().length > 0 && text.trim().length <= 120 && " — add a bit more"}
            </p>
          </>
        )}

        {mode === "youtube" && (
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="input"
          />
        )}

        {mode === "file" && (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              chooseFile(event.dataTransfer.files[0]);
            }}
            className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-brand-400 bg-brand-500/5" : "border-ink-700"
            }`}
          >
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            {file ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink-100">{file.name}</p>
                <p className="text-xs text-ink-400">{(file.size / 1024).toFixed(0)} KB</p>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs font-semibold text-brand-300 underline underline-offset-2"
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-ink-300">Drop a file here</p>
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="text-sm font-semibold text-brand-300 underline underline-offset-2"
                >
                  or browse your computer
                </button>
                <p className="text-xs text-ink-400">PDF, DOCX, PNG, JPG · up to 20 MB</p>
              </div>
            )}
          </div>
        )}

        {error && <ErrorBanner message={error} />}

        <button type="button" onClick={submit} disabled={!ready || submitting} className="btn-primary w-full py-3">
          {submitting ? (
            <>
              <Spinner /> Starting…
            </>
          ) : (
            "Generate Study Suite"
          )}
        </button>

        <p className="text-center text-xs text-ink-400">
          No prompt needed. Everything below is generated automatically.
        </p>
      </div>
    </div>
  );
}

function textPayload(mode: Mode, text: string, url: string) {
  return mode === "text"
    ? { kind: "text" as const, text: text.trim() }
    : { kind: "youtube" as const, url: url.trim() };
}

async function filePayload(file: File) {
  const kind: SourceKind = file.name.toLowerCase().endsWith(".pdf")
    ? "pdf"
    : file.name.toLowerCase().endsWith(".docx")
      ? "docx"
      : "image";

  return {
    kind,
    fileBase64: await toBase64(file),
    fileName: file.name,
    mimeType: file.type || undefined,
  };
}

/** FileReader keeps large uploads off the main thread better than a manual loop. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}
