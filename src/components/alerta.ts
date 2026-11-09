import { useEffect } from "react";

/** Tela não apaga (treino, leitura), onde o navegador deixa. */
export function useTelaAcesa(ativo: boolean) {
  useEffect(() => {
    if (!ativo || !("wakeLock" in navigator)) return;
    let trava: WakeLockSentinel | null = null;
    const pedir = () => navigator.wakeLock.request("screen").then((t) => (trava = t)).catch(() => {});
    pedir();
    const voltou = () => document.visibilityState === "visible" && pedir();
    document.addEventListener("visibilitychange", voltou);
    return () => { document.removeEventListener("visibilitychange", voltou); trava?.release().catch(() => {}); };
  }, [ativo]);
}

// ------------------------------------------------------------------ som
// O iPhone só libera áudio depois de um toque: um som criado na hora que o tempo acaba (sem toque) sai mudo. Por isso o
// contexto de áudio é criado e "destravado" num toque (liberarSom) e reaproveitado quando o alarme precisa tocar.

let ctx: AudioContext | null = null;
let mudo: HTMLAudioElement | null = null;

function contexto(): AudioContext | null {
  if (ctx) return ctx;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}

/** 0,1 s de silêncio em WAV, gerado na hora (sem arquivo no projeto). */
function urlSilencio(): string {
  const n = 800;
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const txt = (o: number, s: string) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  txt(0, "RIFF"); v.setUint32(4, 36 + n, true); txt(8, "WAVE"); txt(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  txt(36, "data"); v.setUint32(40, n, true);
  b.fill(128, 44); // PCM de 8 bits sem sinal: 128 = silêncio
  return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
}

/**
 * Chamar DENTRO de um toque (clique de botão). Destrava o áudio para o alarme tocar depois, sem toque.
 * `manter`: deixa um silêncio tocando em volta, o que no iPhone faz o som ignorar a chave de silêncio. Use `soltarSom` ao sair.
 */
export function liberarSom(manter = false) {
  try {
    contexto()?.resume().catch(() => {});
    if (manter && !mudo) {
      mudo = new Audio(urlSilencio());
      mudo.loop = true;
      mudo.play().catch(() => { mudo = null; });
    }
  } catch {
    /* sem áudio: fica o aviso na tela */
  }
}

export function soltarSom() {
  try { mudo?.pause(); } catch { /* nada */ }
  mudo = null;
}

function bipe(c: AudioContext, freq: number, t: number, dur: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.7, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/**
 * Alarme de fim de tempo: quatro notas (ré–si–ré–si agudos) repetidas, uns 6 s com `repeticoes = 4`, mais vibração onde existe.
 * Resolve quando termina (para fazer algo depois, como desligar o Foco).
 */
export function tocarAlarme(repeticoes = 4): Promise<void> {
  navigator.vibrate?.([300, 150, 300, 150, 600]);
  try {
    const c = contexto();
    if (!c) return Promise.resolve();
    c.resume().catch(() => {});
    const t0 = c.currentTime + 0.05;
    for (let r = 0; r < repeticoes; r++) {
      [880, 1175, 880, 1175].forEach((f, i) => bipe(c, f, t0 + r * 1.5 + i * 0.22, 0.18));
    }
    return new Promise((fim) => setTimeout(fim, repeticoes * 1500 + 200));
  } catch {
    return Promise.resolve();
  }
}

/** Fim do descanso do treino: alarme curto. */
export function avisarFimDescanso() {
  void tocarAlarme(2);
}
