import { useEffect, useState } from 'react';
import { apiUrl } from '../backend.js';
import { preloadRoomIntro } from '../components/RoomIntro.jsx';
import VetoRail from '../components/VetoRail.jsx';

const TIMERS = [
  { value: 30, label: '30 s' },
  { value: 60, label: '60 s' },
  { value: 90, label: '90 s' },
  { value: 0, label: 'Sem limite' },
];

export default function CreateRoom({ onCreated }) {
  const [config, setConfig] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(preloadRoomIntro, []);

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
  const { formats, maps, images, defaultPool, poolSize } = config;
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [format, setFormat] = useState('bo5');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [pool, setPool] = useState(defaultPool);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const poolFull = pool.length === poolSize;

  const toggleMap = (name) =>
    setPool((current) => {
      if (current.includes(name)) return current.filter((m) => m !== name);
      return current.length < poolSize ? [...current, name] : current;
    });

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

  const missingMaps = poolSize - pool.length;
  const namesFilled = teamA.trim() && teamB.trim();
  let status = 'Tudo pronto. Ao criar a sala, você recebe os links dos capitães.';
  if (!namesFilled) status = 'Preencha o nome dos dois times.';
  else if (missingMaps > 0) status = `Escolha mais ${missingMaps} ${missingMaps === 1 ? 'mapa' : 'mapas'} para o map pool.`;

  return (
    <main className="create">
      <form onSubmit={submit}>
        <header className="versus">
          <h1>Veto de mapas da grande final</h1>
          <div className="versus-teams">
            <label className="vs-team">
              <span>Time A, começa o veto</span>
              <input value={teamA} onChange={(e) => setTeamA(e.target.value)} placeholder="Nome do time" maxLength={32} required autoFocus />
            </label>
            <span className="vs-slash" aria-hidden="true">VS</span>
            <label className="vs-team vs-team-b">
              <span>Time B</span>
              <input value={teamB} onChange={(e) => setTeamB(e.target.value)} placeholder="Nome do time" maxLength={32} required />
            </label>
          </div>
        </header>

        <div className="create-body">
          <div className="rules">
            <fieldset className="rule">
              <legend>Formato</legend>
              <div className="segmented">
                {Object.entries(formats).map(([key, { label }]) => (
                  <button type="button" key={key} aria-pressed={format === key} onClick={() => setFormat(key)}>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="rule">
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
          </div>

          <section className="create-section">
            <h2>Ordem do veto</h2>
            <VetoRail
              key={format}
              steps={formats[format].steps}
              teamNames={{ A: teamA.trim() || 'Time A', B: teamB.trim() || 'Time B' }}
            />
          </section>

          <section className="create-section">
            <div className="section-head">
              <h2>Map pool</h2>
              <p className={poolFull ? 'count ok' : 'count'}>{pool.length} de {poolSize} mapas</p>
              {poolFull && <p className="hint">Para trocar, desmarque um mapa.</p>}
            </div>
            <div className="map-strips">
              {maps.map((name) => {
                const selected = pool.includes(name);
                const locked = !selected && poolFull;
                return (
                  <button
                    type="button"
                    key={name}
                    className="map-strip"
                    aria-pressed={selected}
                    aria-disabled={locked}
                    onClick={() => toggleMap(name)}
                  >
                    {images?.[name] && (
                      <img src={images[name].small} alt="" width="456" height="100" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                    <span className="map-strip-name">{name}</span>
                    {selected && (
                      <svg className="map-strip-check" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path d="M4 12.5l5.5 5.5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3.5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="create-bar">
          {error
            ? <p className="form-error" role="alert">{error}</p>
            : <p className="create-status" aria-live="polite">{status}</p>}
          <button className="primary" disabled={busy || !poolFull}>
            {busy ? 'Criando…' : 'Criar sala'}
          </button>
        </div>
      </form>
    </main>
  );
}
