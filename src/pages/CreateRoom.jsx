import { useEffect, useState } from 'react';
import { apiUrl } from '../backend.js';

const TIMERS = [
  { value: 30, label: '30 s' },
  { value: 60, label: '60 s' },
  { value: 90, label: '90 s' },
  { value: 0, label: 'Sem limite' },
];

const STEP_LABEL = { ban: 'Ban', pick: 'Pick', side: 'Lado', decider: 'Decider' };

export default function CreateRoom({ onCreated }) {
  const [config, setConfig] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    fetch(apiUrl('/api/config'))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((body) => {
        if (!cancelled) setConfig(body);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (config) return <CreateForm config={config} onCreated={onCreated} />;

  return (
    <main className="message-page">
      {failed ? (
        <>
          <h1>Não foi possível falar com o servidor</h1>
          <p>Confira se o backend está rodando e tente de novo.</p>
          <button className="primary" onClick={() => setAttempt((n) => n + 1)}>Tentar de novo</button>
        </>
      ) : (
        <h1>Carregando…</h1>
      )}
    </main>
  );
}

function CreateForm({ config, onCreated }) {
  const { formats, maps, defaultPool, poolSize } = config;
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [format, setFormat] = useState('bo5');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [pool, setPool] = useState(defaultPool);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const toggleMap = (name) =>
    setPool((current) => (current.includes(name) ? current.filter((m) => m !== name) : [...current, name]));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/rooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamA, teamB, format, pool, timerSeconds }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error);
        return;
      }
      onCreated(body);
    } catch {
      setError('Não foi possível falar com o servidor. Ele está rodando?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="create">
      <header className="create-head">
        <p className="eyebrow">Grande final</p>
        <h1>Veto de mapas</h1>
      </header>

      <form onSubmit={submit} className="create-form">
        <div className="field-row">
          <label className="field">
            <span>Time A (começa o veto)</span>
            <input value={teamA} onChange={(e) => setTeamA(e.target.value)} maxLength={32} required autoFocus />
          </label>
          <label className="field">
            <span>Time B</span>
            <input value={teamB} onChange={(e) => setTeamB(e.target.value)} maxLength={32} required />
          </label>
        </div>

        <fieldset className="field">
          <legend>Formato</legend>
          <div className="segmented">
            {Object.entries(formats).map(([key, { label }]) => (
              <button type="button" key={key} aria-pressed={format === key} onClick={() => setFormat(key)}>
                {label}
              </button>
            ))}
          </div>
          <ol className="sequence-preview">
            {formats[format].steps.map((step, index) => (
              <li key={index} className={`seq-${step.type}`}>
                {STEP_LABEL[step.type]}
                {step.team && <b>{step.team}</b>}
              </li>
            ))}
          </ol>
        </fieldset>

        <fieldset className="field">
          <legend>Tempo por ação</legend>
          <div className="segmented">
            {TIMERS.map(({ value, label }) => (
              <button type="button" key={value} aria-pressed={timerSeconds === value} onClick={() => setTimerSeconds(value)}>
                {label}
              </button>
            ))}
          </div>
          <p className="hint">
            {timerSeconds
              ? 'Se o tempo acabar, o sistema escolhe ao acaso. A organização pode pausar ou desfazer.'
              : 'O veto só avança quando o capitão escolher.'}
          </p>
        </fieldset>

        <fieldset className="field">
          <legend>
            Map pool <span className={pool.length === poolSize ? 'count ok' : 'count'}>{pool.length}/{poolSize}</span>
          </legend>
          <div className="pool">
            {maps.map((name) => (
              <button type="button" key={name} aria-pressed={pool.includes(name)} onClick={() => toggleMap(name)}>
                {name}
              </button>
            ))}
          </div>
        </fieldset>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button className="primary" disabled={busy || pool.length !== poolSize}>
          {busy ? 'Criando…' : 'Criar sala'}
        </button>
      </form>
    </main>
  );
}
