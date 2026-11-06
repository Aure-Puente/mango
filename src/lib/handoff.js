import { useEffect, useRef, useState } from 'react';

/**
 * "Pase" del mango de la splash a la primera pantalla.
 *
 * La pantalla que aparece después de la splash (el logo del login, o el botón mango de Inicio)
 * se anota acá con una función para medir dónde está y otra para mostrarse. La splash lee el
 * destino, lleva su mango hasta ese lugar y, al llegar, le avisa que ya puede aparecer.
 * Si no hay destino (o tarda), la splash hace su salida de siempre y todos se muestran solos.
 */
const state = { target: null, finished: false };

export const handoff = {
  /** Destino anotado: { kind: 'login' | 'fab', measure(cb), reveal() } */
  target: () => state.target,
  /** La splash terminó: lo que se monte de ahora en más se muestra directo */
  finish() {
    state.finished = true;
    state.target?.reveal();
    state.target = null;
  },
  isFinished: () => state.finished,
};

/**
 * Para el mango de destino. Devuelve [ref, visible]: poné `ref` en la vista del mango
 * (con collapsable={false}) y usá `visible` para su opacidad. Mientras la splash corre,
 * queda oculto; se muestra cuando la splash llega o termina.
 */
export function useHandoffTarget(kind) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(() => state.finished);

  useEffect(() => {
    // Si la splash ya terminó, `visible` arrancó en true: no hay nada que esperar
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
    // Red de seguridad: pase lo que pase, a los 4 s se muestra
    const t = setTimeout(() => setVisible(true), 4000);
    return () => {
      clearTimeout(t);
      if (state.target === me) state.target = null;
    };
  }, [kind]);

  return [ref, visible];
}