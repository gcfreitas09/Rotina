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

/** Fim de um tempo (descanso, leitura): vibra e dá dois bipes curtos (o toque na tela já liberou o áudio). */
export function avisarFimDescanso() {
  navigator.vibrate?.([200, 100, 200]);
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [0, 0.22].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.18);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* sem áudio: fica a vibração e o aviso */
  }
}
