// ==================== VALIDAÇÃO DE SENHA FORTE ====================

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  valid: boolean;
  errors: string[];
}

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export function validatePassword(password: string): PasswordStrength {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push("Mínimo 8 caracteres");
  } else {
    score++;
    if (password.length >= 12) score++;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Pelo menos 1 letra maiúscula");
  } else {
    score++;
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Pelo menos 1 número");
  } else {
    score++;
  }

  if (!SPECIAL_CHARS.test(password)) {
    errors.push("Pelo menos 1 caractere especial (!@#$%...)");
  } else {
    score++;
  }

  score = Math.min(score, 4);

  const levels = [
    { label: "Muito Fraca", color: "#f87171" },
    { label: "Fraca",       color: "#fb923c" },
    { label: "Razoável",    color: "#fbbf24" },
    { label: "Boa",         color: "#34d399" },
    { label: "Forte",       color: "#10b981" },
  ];

  return {
    score,
    label: levels[score].label,
    color: levels[score].color,
    valid: errors.length === 0,
    errors,
  };
}

export function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;

  const strength = validatePassword(password);

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        {[1, 2, 3, 4].map(level => (
          <div key={level} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: strength.score >= level ? strength.color : "#1a2035",
            transition: "background 0.3s ease",
          }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>
          {strength.label}
        </span>
        {strength.valid && (
          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 600 }}>✓ Válida</span>
        )}
      </div>
      {strength.errors.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {strength.errors.map((err, i) => (
            <span key={i} style={{ fontSize: 11, color: "#4a5568" }}>
              <span style={{ color: "#f87171" }}>✗ </span>{err}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}