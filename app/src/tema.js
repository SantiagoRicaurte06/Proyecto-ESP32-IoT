export const color = {
  fondo: "#F3F4F6",
  tarjeta: "#FFFFFF",
  borde: "#E5E7EB",
  texto: "#111827",
  suave: "#6B7280",
  acento: "#1D4ED8",
  acentoSuave: "#DBEAFE",
  error: "#B91C1C",
};

export const riesgo = {
  verde:    { fondo: "#DCFCE7", fuerte: "#15803D", texto: "Normal", consejo: "Sin riesgo. Paso habilitado." },
  amarillo: { fondo: "#FEF9C3", fuerte: "#A16207", texto: "Vigilancia", consejo: "El agua sube. Esté atento a nuevas alertas." },
  naranja:  { fondo: "#FFEDD5", fuerte: "#C2410C", texto: "Preparación", consejo: "Paso cerrado. Prepárese para evacuar la ribera." },
  rojo:     { fondo: "#FEE2E2", fuerte: "#B91C1C", texto: "Evacuación", consejo: "Aléjese del río y del puente ahora." },
};

export const NIVELES = ["verde", "amarillo", "naranja", "rojo"];

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
