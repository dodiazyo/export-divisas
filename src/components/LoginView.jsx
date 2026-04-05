import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export default function LoginView({ onLogin, onGoRegister, onForgotPassword }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [time, setTime]         = useState(new Date());

  // Reloj
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);

      // Guardar contexto del tenant si viene en la respuesta
      if (res.tenant) {
        localStorage.setItem('divisas-tenant-id', res.tenant.id);
        localStorage.setItem('divisas-tenant-name', res.tenant.businessName);
      }

      onLogin(res.user, res.token);
    } catch (err) {
      setError(err.message || 'Correo o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const inputBase = {
    width: '100%',
    padding: '13px 14px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
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
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,67,0.1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '32px 28px 24px',
          background: 'var(--gradient-card-header)',
          borderBottom: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: 32,
            boxShadow: '0 8px 24px rgba(212,168,67,0.3)',
          }}>💱</div>

          <h1 style={{
            fontSize: 22, fontWeight: 800, letterSpacing: 2,
            color: 'var(--text-primary)', marginBottom: 4,
          }}>
            DIVISAS <span style={{ color: 'var(--gold)' }}>PRO</span>
          </h1>

          <p style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Sistema de Gestión
          </p>

          <div style={{
            fontSize: 28, fontWeight: 800, fontFamily: 'monospace',
            color: 'var(--gold)', letterSpacing: 3,
          }}>
            {time.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '28px 28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <p style={{
            textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
            letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
          }}>
            Iniciar sesión
          </p>

          {/* Email */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'var(--text-subtle)', letterSpacing: 1.5,
              textTransform: 'uppercase', marginBottom: 7,
            }}>
              Correo electrónico
            </label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              style={inputBase}
              placeholder="usuario@negocio.com"
              onFocus={e => e.target.style.borderColor = 'var(--gold)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Contraseña */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700,
              color: 'var(--text-subtle)', letterSpacing: 1.5,
              textTransform: 'uppercase', marginBottom: 7,
            }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                style={{ ...inputBase, paddingRight: 44 }}
                placeholder="Tu contraseña"
                onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-subtle)', padding: 4,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'var(--red-bg)', border: '1px solid var(--red-border)',
              borderRadius: 8, padding: '10px 14px',
              color: 'var(--red)', fontSize: 13, fontWeight: 600,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              height: 52, borderRadius: 12, border: 'none', marginTop: 4,
              background: (!loading && email && password)
                ? 'linear-gradient(135deg, var(--gold), var(--gold-light))'
                : 'var(--bg-elevated)',
              color: (!loading && email && password) ? 'var(--bg-base)' : 'var(--text-subtle)',
              fontSize: 14, fontWeight: 900, letterSpacing: 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
              : <> Ingresar <ArrowRight size={18} /></>
            }
          </button>

          {/* Links inferiores */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onForgotPassword}
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-subtle)', fontSize: 12,
                fontWeight: 600, cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button
              type="button"
              onClick={onGoRegister}
              style={{
                background: 'none', border: 'none',
                color: 'var(--gold)', fontSize: 13,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              Crear cuenta nueva →
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
