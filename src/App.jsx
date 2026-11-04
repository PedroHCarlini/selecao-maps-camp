import { useCallback, useEffect, useState } from 'react';
import RoomIntro from './components/RoomIntro.jsx';
import CreateRoom from './pages/CreateRoom.jsx';
import Room from './pages/Room.jsx';

// O token do link fica no hash (/sala/ID#TOKEN), que não é enviado em requisições nem no Referer.
function readLocation() {
  const match = window.location.pathname.match(/^\/sala\/([\w-]+)\/?$/);
  return match ? { roomId: match[1], token: window.location.hash.slice(1) } : { roomId: null, token: '' };
}

export default function App() {
  const [location, setLocation] = useState(readLocation);
  const [showIntro, setShowIntro] = useState(false);
  const closeIntro = useCallback(() => setShowIntro(false), []);

  useEffect(() => {
    const update = () => setLocation(readLocation());
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
    };
  }, []);

  if (!location.roomId) {
    return (
      <CreateRoom
        onCreated={({ id, adminToken }) => {
          window.history.pushState(null, '', `/sala/${id}#${adminToken}`);
          window.scrollTo(0, 0);
          setShowIntro(true);
          setLocation(readLocation());
        }}
      />
    );
  }
  return (
    <>
      <Room key={`${location.roomId}#${location.token}`} roomId={location.roomId} token={location.token} />
      {showIntro && <RoomIntro onDone={closeIntro} />}
    </>
  );
}
