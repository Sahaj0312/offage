import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

/**
 * Cinematic post-processing. Bloom reads HDR pixels (emissive materials with
 * intensity > 1 and toneMapped=false), so monitors, neon, the status bubbles and
 * the Manager's beacon glow and bleed light — the core of the "wow". Vignette
 * focuses the frame. Tone mapping is set on the renderer (ACES) in App.
 */
export function Effects() {
  return (
    <EffectComposer multisampling={2}>
      <Bloom
        mipmapBlur
        intensity={0.8}
        luminanceThreshold={1.0}
        luminanceSmoothing={0.25}
        levels={5}
      />
      <Vignette offset={0.32} darkness={0.55} eskil={false} />
    </EffectComposer>
  );
}
