import React, { useState } from 'react';
import { api } from '../lib/api';
import { Eye, EyeOff, Clock, CheckCircle } from 'lucide-react';

export default function RegisterView({ onRegistered, onGoLogin }) {
  const [form, setForm] = useState({ businessName: '', ownerName: '', email: '', password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingInfo, setPendingInfo] = useState(null);

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Las contraseñas no coinciden'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    setLoading(true);
    try {
      const res = await api.register(form.businessName.trim(), form.ownerName.trim(), form.email.trim(), form.password);
      if (res.pending) {
        setPendingInfo({ businessName: res.businessName, email: res.email });
      } else {
        // Legacy: if somehow token is returned, log in (shouldn't happen now)
        onRegistered(res.token, res.user, res.tenant);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontSize: 14, outline: 'none', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  };
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: 'var(--text-subtle)', letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 6,
  };

  // ── Pending approval screen ──────────────────────────────────────────────────
  if (pendingInfo) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}>
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 20, width: '100%', maxWidth: 420, overflow: 'hidden',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)', textAlign: 'center',
        }}>
          {/* Header */}
          <div style={{
            background: 'var(--gold-bg)', borderBottom: '1px solid rgba(212,168,67,0.2)',
            padding: '36px 32px 28px',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(212,168,67,0.4)',
            }}>
              <CheckCircle size={34} color="var(--bg-base)" strokeWidth={2.5} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--gold-light)', marginBottom: 6 }}>
              ¡Solicitud enviada!
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-subtle)' }}>
              Tu cuenta ha sido creada correctamente
            </div>
          </div>

          <div style={{ padding: '28px 32px 32px' }}>
            {/* Info */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 18px', marginBottom: 20, textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Clock size={16} color="var(--gold)" />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Pendiente de aprobación
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{pendingInfo.businessName}</strong>
                <br />
                {pendingInfo.email}
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-subtle)', lineHeight: 1.7, marginBottom: 24 }}>
              Un administrador revisará tu solicitud y activará tu cuenta. Recibirás acceso una vez aprobada.
            </p>

            <button onClick={onGoLogin} style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              color: 'var(--bg-base)', fontSize: 14, fontWeight: 900, letterSpacing: 0.5,
            }}>
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 460, overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--gradient-card-header)',
          borderBottom: '1px solid var(--border)',
          padding: '28px 32px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', fontSize: 28,
            boxShadow: '0 8px 24px rgba(212,168,67,0.3)',
          }}>💱</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: 1 }}>
            DIVISAS <span style={{ color: 'var(--gold)' }}>PRO</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-subtle)', marginTop: 4 }}>
            Solicitar acceso al sistema
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nombre del negocio</label>
              <input
                type="text" required value={form.businessName} onChange={set('businessName')}
                style={inputStyle} placeholder="Casa de Cambio Express"
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            <div>
              <label style={labelStyle}>Tu nombre</label>
              <input
                type="text" required value={form.ownerName} onChange={set('ownerName')}
                style={inputStyle} placeholder="Juan Pérez"
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Correo electrónico</label>
            <input
              type="email" required value={form.email} onChange={set('email')}
              style={inputStyle} placeholder="tu@negocio.com"
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  style={{ ...inputStyle, paddingRight: 40 }} placeholder="Mín. 8 caracteres"
                  onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: 4,
                }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confirmar</label>
              <input
                type={showPass ? 'text' : 'password'} required value={form.confirm} onChange={set('confirm')}
                style={inputStyle} placeholder="Repite la contraseña"
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              borderRadius: 8, padding: '8px 14px', color: 'var(--red)', fontSize: 13, fontWeight: 600,
            }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            height: 50, borderRadius: 12, border: 'none', marginTop: 4,
            background: !loading ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'var(--bg-elevated)',
            color: !loading ? 'var(--bg-base)' : 'var(--text-subtle)',
            fontSize: 15, fontWeight: 900, cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: 1, transition: 'all 0.2s',
          }}>
            {loading ? 'Enviando solicitud...' : 'Solicitar acceso →'}
          </button>

          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-subtle)' }}>
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={onGoLogin} style={{
              background: 'none', border: 'none', color: 'var(--gold)', fontWeight: 700,
              cursor: 'pointer', fontSize: 13, padding: 0,
            }}>
              Iniciar sesión
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
