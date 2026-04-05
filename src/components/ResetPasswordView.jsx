import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

export default function ResetPasswordView({ token, onSuccess }) {
  const [status, setStatus]       = useState('verifying'); // verifying | valid | invalid | success
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  // Verificar token al montar
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    api.verifyResetToken(token)
      .then(data => { setEmail(data.email); setStatus('valid'); })
      .catch(() => setStatus('invalid'));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6)  { setError('Mínimo 6 caracteres'); return; }

    setLoading(true); setError('');
    try {
      await api.resetPassword(token, password);
      setStatus('success');
    } catch (err) {
      setError(err.message || 'Error al restablecer. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '13px 14px', boxSizing: 'border-box',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gradient-page)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          padding: '28px 28px 20px', textAlign: 'center',
          background: 'var(--gradient-card-header)',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💱</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            DIVISAS <span style={{ color: 'var(--gold)' }}>PRO</span>
          </h1>
        </div>

        <div style={{ padding: '28px' }}>

          {/* Verificando */}
          {status === 'verifying' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Loader2 size={36} color="var(--gold)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px', display: 'block' }} />
              <p style={{ color: 'var(--text-subtle)', fontSize: 14 }}>Verificando enlace...</p>
            </div>
          )}

          {/* Token inválido */}
          {status === 'invalid' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'var(--red-bg)', border: '2px solid var(--red-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AlertTriangle size={28} color="var(--red)" />
              </div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
                Enlace inválido o expirado
              </h2>
              <p style={{ color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
                Este enlace ya fue usado o expiró (válido por 15 min). Solicita uno nuevo.
              </p>
              <button
                onClick={onSuccess}
                style={{
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                  border: 'none', borderRadius: 10, padding: '11px 28px',
                  color: 'var(--bg-base)', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                }}
              >
                Solicitar nuevo enlace
              </button>
            </div>
          )}

          {/* Formulario válido */}
          {status === 'valid' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>
                  Nueva contraseña
                </h2>
                <p style={{ color: 'var(--text-subtle)', fontSize: 12, margin: '0 0 20px' }}>
                  Para la cuenta: <strong style={{ color: 'var(--gold)' }}>{email}</strong>
                </p>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>
                  Nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} required autoFocus
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    placeholder="Mínimo 6 caracteres"
                    onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: 4,
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-subtle)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>
                  Confirmar contraseña
                </label>
                <input
                  type="password" required
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  style={{
                    ...inputStyle,
                    borderColor: confirm && password !== confirm ? 'var(--red)' : 'var(--border)',
                  }}
                  placeholder="Repite la contraseña"
                  onFocus={e => e.target.style.borderColor = confirm && password !== confirm ? 'var(--red)' : 'var(--gold)'}
                  onBlur={e => e.target.style.borderColor = confirm && password !== confirm ? 'var(--red)' : 'var(--border)'}
                />
                {confirm && password !== confirm && (
                  <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Indicador de fuerza */}
              {password && (
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= getStrength(password)
                          ? ['','#ef4444','#f59e0b','#22c55e','#16a34a'][getStrength(password)]
                          : 'var(--border)',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: 0 }}>
                    {['','Muy débil','Débil','Buena','Fuerte'][getStrength(password)]}
                  </p>
                </div>
              )}

              {error && (
                <div style={{
                  background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                  borderRadius: 8, padding: '10px 14px', color: 'var(--red)', fontSize: 13, fontWeight: 600,
                }}>
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                style={{
                  height: 50, borderRadius: 12, border: 'none', marginTop: 4,
                  background: (!loading && password && confirm)
                    ? 'linear-gradient(135deg, var(--gold), var(--gold-light))'
                    : 'var(--bg-elevated)',
                  color: (!loading && password && confirm) ? 'var(--bg-base)' : 'var(--text-subtle)',
                  fontSize: 14, fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                  : '🔐 Guardar nueva contraseña'
                }
              </button>
            </form>
          )}

          {/* Éxito */}
          {status === 'success' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#052e16', border: '2px solid #16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
                ¡Contraseña actualizada!
              </h2>
              <p style={{ color: 'var(--text-subtle)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Tu contraseña fue cambiada correctamente. Ya puedes iniciar sesión.
              </p>
              <button
                onClick={onSuccess}
                style={{
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
                  border: 'none', borderRadius: 10, padding: '12px 32px',
                  color: 'var(--bg-base)', fontWeight: 900, fontSize: 14, cursor: 'pointer',
                }}
              >
                Ir al inicio de sesión →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function getStrength(pw) {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}
