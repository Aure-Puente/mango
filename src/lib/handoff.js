//handoff:
import { useEffect, useRef, useState } from 'react';

const state = { target: null, finished: false };

export const handoff = {
  target: () => state.target,
  finish() {
    state.finished = true;
    state.target?.reveal();
    state.target = null;
  },
  isFinished: () => state.finished,
};

export function useHandoffTarget(kind) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => state.finished);

  useEffect(() => {
    if (state.finished) return undefined;
    const me = {
      kind,
      measure: (cb) => {
        const node = ref.current;
        if (!node?.measureInWindow) return cb(null);
        node.measureInWindow((x, y, w, h) => cb(w && h ? { x, y, w, h } : null));
      },
      reveal: () => setVisible(true),
    };
    state.target = me;
    const t = setTimeout(() => setVisible(true), 4000);
    return () => {
      clearTimeout(t);
      if (state.target === me) state.target = null;
    };
  }, [kind]);

  return [ref, visible];
}