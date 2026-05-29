import { useState, useCallback } from 'react';
import type { DragEvent } from 'react';
import { useStore } from '../store';
import { parseFile } from '../../lib/parse';
import { startInterview, pushAudio } from '../../lib/engine';
import { startAudio, stopAudio } from '../../lib/audio';
import { hasValidSettings } from '../../lib/settings';
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

  const settings = useStore((s) => s.settings);
  const openSettings = useStore((s) => s.openSettings);
  const keysReady = hasValidSettings(settings);

  const canStart =
    keysReady &&
    jd.trim().length > 0 &&
    resume.trim().length > 0 &&
    audioStatus !== 'starting';

  async function handleStart() {
    if (!hasValidSettings(settings)) {
      openSettings();
      return;
    }

    setAudioStatus('starting');

    try {
      await startAudio({
        onChunk: (blob) => pushAudio(blob),
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
    startInterview({ jd, resume, seniority, interviewType }, settings);
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div>
        <h2 className="display text-xl font-semibold text-ink">New interview</h2>
        <p className="mt-0.5 text-[13px] text-muted">
          Add the role and résumé, then start. Questions and live feedback appear as the
          candidate speaks.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Uploader
          label="Job description"
          step={1}
          kind="jd"
          text={jd}
          fileName={jdFileName}
          onParsed={setJd}
        />
        <Uploader
          label="Candidate résumé"
          step={2}
          kind="resume"
          text={resume}
          fileName={resumeFileName}
          onParsed={setResume}
        />
      </div>

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
        <p className="rounded-lg border border-[color-mix(in_srgb,var(--color-weak)_30%,transparent)] bg-weak-bg p-2.5 text-xs leading-relaxed text-weak">
          {audioError}
        </p>
      )}

      {!keysReady && (
        <button
          type="button"
          onClick={openSettings}
          className="rounded-lg border border-[color-mix(in_srgb,var(--color-adequate)_35%,transparent)] bg-adequate-bg p-2.5 text-left text-xs leading-relaxed text-adequate transition hover:brightness-[0.98]"
        >
          Add your Deepgram and LLM API keys in <strong>Settings</strong> before starting.
          Tap to configure →
        </button>
      )}

      <button
        type="button"
        disabled={!canStart}
        onClick={handleStart}
        className="btn btn-primary btn-md mt-auto w-full"
      >
        {audioStatus === 'starting' ? 'Starting…' : 'Start interview'}
      </button>
    </div>
  );
}

interface UploaderProps {
  label: string;
  step: number;
  kind: UploadKind;
  text: string;
  fileName: string | undefined;
  onParsed: (text: string, fileName?: string) => void;
}

function Uploader({ label, step, kind, text, fileName, onParsed }: UploaderProps) {
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

  const done = !!text;

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <StepDot n={step} done={done} />
        <span className="label-eyebrow">{label}</span>
      </div>
      <label
        htmlFor={`upload-${kind}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-5 text-center text-sm transition ${
          dragOver
            ? 'border-accent bg-accent-soft'
            : done
              ? 'border-[color-mix(in_srgb,var(--color-strong)_45%,transparent)] bg-strong-bg'
              : 'border-line-strong bg-surface hover:border-muted'
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
          <span className="text-muted">Parsing…</span>
        ) : done ? (
          <span className="font-medium text-strong">
            {fileName ?? 'Uploaded'} · {text.length.toLocaleString()} chars
          </span>
        ) : (
          <span className="text-muted">Drop a PDF or DOCX, or click to choose</span>
        )}
      </label>

      {error && <p className="text-xs text-weak">{error}</p>}

      {done && (
        <button
          type="button"
          className="self-start text-[11px] font-semibold text-accent hover:underline"
          onClick={() => setPreviewOpen((v) => !v)}
        >
          {previewOpen ? 'Hide preview' : 'Show preview'}
        </button>
      )}

      {previewOpen && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-paper-sunk p-2.5 text-xs leading-relaxed text-ink-soft">
          {text.slice(0, 4000)}
          {text.length > 4000 ? '\n…' : ''}
        </pre>
      )}
    </section>
  );
}

function StepDot({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
        done ? 'bg-strong text-white' : 'bg-paper-sunk text-muted'
      }`}
    >
      {done ? '✓' : n}
    </span>
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
    <label className="flex flex-col gap-1.5">
      <span className="label-eyebrow">{label}</span>
      <select
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className="field-input"
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
