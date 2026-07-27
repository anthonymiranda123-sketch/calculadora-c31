// Paleta do cockpit (Rep Control / Closers Control) — Safety Orange como herói,
// usada com ousadia, não como decoração. Mesmos valores da calculadora do Rep
// Control, pra que as duas ferramentas pareçam a mesma família.
export const COR = {
  primaria: "#FF6A14",   // laranja herói — ações, destaques, melhor opção
  primariaEsc: "#C2410C", // fim do gradiente
  clara: "#FF8A3D",      // alta chance
  suave: "#FFB37A",      // barras distantes no histograma
  ambar: "#FAAF2E",      // fidelidade / chance média
  ambarEsc: "#E09112",   // chance baixa
  erro: "#D83C31",       // muito baixa / comprometimento estourado
};

export const GRADIENTE = `linear-gradient(135deg,${COR.primaria},${COR.primariaEsc})`;
