import { useState, useCallback } from 'react';
import type { DragEvent } from 'react';
import { useStore } from '../store';
import { parseFile } from '../../lib/parse';
import { send, sendBinary } from '../../lib/ws';
import { startAudio, stopAudio } from '../../lib/audio';
import type { InterviewType, Seniority } from '@interview-copilot/shared';

type UploadKind = 'jd' | 'resume';

export function SetupView() {
  const jd = useStore((s) => s.jd);
  const jdFileName = useStore((s) => s.jdFileName);
  const resume = useStore((s) => s.resume);
  const resumeFileName = useStore((s) => s.resumeFileName);
  const seniority = useStore((s) => s.seniority);
  const interviewType = useStore((s) => s.interviewType);
  const setJd = useStore((s) => s.setJd);
  const setResume = useStore((s) => s.setResume);
  const setSeniority = useStore((s) => s.setSeniority);
  const setInterviewType = useStore((s) => s.setInterviewType);

  const audioStatus = useStore((s) => s.audioStatus);
  const audioError = useStore((s) => s.audioError);
  const setAudioStatus = useStore((s) => s.setAudioStatus);

  const canStart =
    jd.trim().length > 0 &&
    resume.trim().length > 0 &&
    audioStatus !== 'starting';

  async function handleStart() {
    setAudioStatus('starting');

    try {
      await startAudio({
        onChunk: (blob) => {
          blob.arrayBuffer().then((buf) => sendBinary(buf));
        },
        onError: (err) => {
          setAudioStatus('error', err.message);
          stopAudio();
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setAudioStatus('error', message);
      return;
    }

    setAudioStatus('capturing');
    send({
      type: 'START_INTERVIEW',
      jd,
      resume,
      seniority,
      interviewType,
    });
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <Uploader
        label="Job description"
        kind="jd"
        text={jd}
        fileName={jdFileName}
        onParsed={setJd}
      />
      <Uploader
        label="Candidate resume"
        kind="resume"
        text={resume}
        fileName={resumeFileName}
        onParsed={setResume}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Seniority"
          value={seniority}
          options={[
            ['junior', 'Junior'],
            ['mid', 'Mid'],
            ['senior', 'Senior'],
          ]}
          onChange={(v) => setSeniority(v as Seniority)}
        />
        <Select
          label="Interview type"
          value={interviewType}
          options={[
            ['screening', 'Screening'],
            ['deep_dive', 'Deep dive'],
          ]}
          onChange={(v) => setInterviewType(v as InterviewType)}
        />
      </div>

      {audioStatus === 'error' && audioError && (
        <p className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          {audioError}
        </p>
      )}

      <button
        type="button"
        disabled={!canStart}
        onClick={handleStart}
        className="mt-auto rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {audioStatus === 'starting' ? 'Starting…' : 'Start interview'}
      </button>
    </div>
  );
}

interface UploaderProps {
  label: string;
  kind: UploadKind;
  text: string;
  fileName: string | undefined;
  onParsed: (text: string, fileName?: string) => void;
}

function Uploader({ label, kind, text, fileName, onParsed }: UploaderProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setPending(true);
      try {
        const parsed = await parseFile(file);
        if (!parsed) throw new Error('No text extracted from file');
        onParsed(parsed, file.name);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setPending(false);
      }
    },
    [onParsed],
  );

  function onDragOver(ev: DragEvent<HTMLLabelElement>) {
    ev.preventDefault();
    setDragOver(true);
  }
  function onDragLeave() {
    setDragOver(false);
  }
  function onDrop(ev: DragEvent<HTMLLabelElement>) {
    ev.preventDefault();
    setDragOver(false);
    const file = ev.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <section className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </label>
      <label
        htmlFor={`upload-${kind}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-3 py-4 text-center text-sm transition ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : text
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-neutral-300 bg-white hover:border-neutral-400'
        }`}
      >
        <input
          id={`upload-${kind}`}
          type="file"
          accept=".pdf,.docx,.txt,.md,text/plain"
          className="sr-only"
          onChange={(ev) => {
            const file = ev.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {pending ? (
          <span className="text-neutral-600">Parsing…</span>
        ) : text ? (
          <span className="text-emerald-700">
            <strong>{fileName ?? 'Uploaded'}</strong> ·{' '}
            {text.length.toLocaleString()} chars
          </span>
        ) : (
          <span className="text-neutral-500">
            Drop a PDF or DOCX here, or click to select
          </span>
        )}
      </label>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {text && (
        <button
          type="button"
          className="self-start text-xs text-indigo-600 hover:underline"
          onClick={() => setPreviewOpen((v) => !v)}
        >
          {previewOpen ? 'Hide preview' : 'Show preview'}
        </button>
      )}

      {previewOpen && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs text-neutral-700">
          {text.slice(0, 4000)}
          {text.length > 4000 ? '\n…' : ''}
        </pre>
      )}
    </section>
  );
}

interface SelectProps {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (v: string) => void;
}

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
