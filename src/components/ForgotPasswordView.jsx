import React, { useState } from 'react';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function ForgotPasswordView({ onBack }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Error al enviar. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
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
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          padding: '28px 28px 20px',
          background: 'var(--gradient-card-header)',
          borderBottom: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
          }}>
            <Mail size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Restablecer contraseña
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-subtle)', margin: 0 }}>
            Te enviaremos un enlace a tu correo
          </p>
        </div>

        <div style={{ padding: '28px' }}>
          {!sent ? (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: 'var(--text-subtle)', letterSpacing: 1.5,
                  textTransform: 'uppercase', marginBottom: 7,
                }}>
                  Correo electrónico
                </label>
                <input
                  type="email" required autoFocus
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  style={{
                    width: '100%', padding: '13px 14px', boxSizing: 'border-box',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  }}
                  placeholder="tu@correo.com"
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {error && (
                <div style={{
                  background: 'var(--red-bg)', border: '1px solid var(--red-border)',
                  borderRadius: 8, padding: '10px 14px',
                  color: 'var(--red)', fontSize: 13, fontWeight: 600,
                }}>
                  ⚠ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  height: 50, borderRadius: 12, border: 'none',
                  background: (!loading && email) ? 'linear-gradient(135deg,#1e40af,#3b82f6)' : 'var(--bg-elevated)',
                  color: (!loading && email) ? 'white' : 'var(--text-subtle)',
                  fontSize: 14, fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                  : '📧 Enviar enlace de restablecimiento'
                }
              </button>

              <button
                type="button" onClick={onBack}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-subtle)', fontSize: 13, fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 0',
                }}
              >
                <ArrowLeft size={15} /> Volver al inicio de sesión
              </button>

            </form>
          ) : (
            /* Éxito */
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#052e16', border: '2px solid #16a34a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <CheckCircle size={32} color="#22c55e" />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
                ¡Correo enviado!
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-subtle)', lineHeight: 1.6, marginBottom: 8 }}>
                Si <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> está registrado,
                recibirás un enlace para restablecer tu contraseña.
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 24 }}>
                El enlace expira en <strong>15 minutos</strong>. Revisa también tu carpeta de spam.
              </p>
              <button
                onClick={onBack}
                style={{
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 24px',
                  color: 'var(--gold)', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ← Volver al login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
