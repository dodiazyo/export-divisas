import React, { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '../lib/api';

export default function ChangePinModal({ isOpen, forced = false, onChanged, onClose }) {
  const [step, setStep]         = useState(1); // 1=new, 2=confirm
  const [newPin, setNewPin]     = useState('');
  const [confirmPin, setConfirm] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  if (!isOpen) return null;

  const active     = step === 1 ? (forced ? newPin : currentPin) : step === 2 ? newPin : confirmPin;
  const maxDigits  = 10;

  const handleNum = (n) => {
    setError('');
    if (step === 0) { if (currentPin.length < maxDigits) setCurrentPin(p => p + n); }
    else if (step === 1) { if (newPin.length < maxDigits) setNewPin(p => p + n); }
    else { if (confirmPin.length < maxDigits) setConfirm(p => p + n); }
  };

  const handleDel = () => {
    if (step === 0) setCurrentPin(p => p.slice(0,-1));
    else if (step === 1) setNewPin(p => p.slice(0,-1));
    else setConfirm(p => p.slice(0,-1));
  };

  // If not forced, first step is current PIN verification
  const firstStep  = forced ? 1 : 0;
  React.useEffect(() => { setStep(firstStep); setNewPin(''); setConfirm(''); setCurrentPin(''); setError(''); }, [isOpen]);

  const handleNext = async () => {
    if (step === firstStep && !forced && currentPin.length < 4) { setError('PIN actual muy corto'); return; }
    if (step === 1 && newPin.length < 4) { setError('PIN debe tener al menos 4 dígitos'); return; }
    if (step === 2) {
      if (confirmPin !== newPin) { setError('Los PINs no coinciden'); setConfirm(''); return; }
      // Submit
      setLoading(true);
      try {
        await api.changePin(forced ? null : currentPin, newPin);
        onChanged();
      } catch (err) {
        setError(err.message || 'Error al cambiar PIN');
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep(s => s + 1);
  };

  const labels = forced
    ? ['', 'Nuevo PIN', 'Confirmar PIN']
    : ['PIN Actual', 'Nuevo PIN', 'Confirmar PIN'];

  const currentValue = step === 0 ? currentPin : step === 1 ? newPin : confirmPin;
  const dots = Array(Math.max(6, currentValue.length)).fill(0).map((_, i) => i < currentValue.length);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--gold-bg), var(--bg-surface))',
          borderBottom: '1px solid var(--border)',
          padding: '24px 24px 20px', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(212,168,67,0.35)',
          }}>
            <KeyRound size={24} color="var(--bg-base)" strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            {forced ? '🔐 Cambio de PIN obligatorio' : 'Cambiar PIN'}
          </div>
          {forced && (
            <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>
              Por seguridad debes establecer un PIN personal
            </div>
          )}
        </div>

        <div style={{ padding: '24px' }}>
          {/* Step label */}
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
            {labels[step]}
          </p>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
            {dots.map((filled, i) => (
              <div key={i} style={{
                width: 13, height: 13, borderRadius: '50%',
                background: filled ? 'var(--gold)' : 'transparent',
                border: `2px solid ${filled ? 'var(--gold)' : 'var(--border)'}`,
                transition: 'all 0.12s',
                boxShadow: filled ? '0 0 7px rgba(212,168,67,0.5)' : 'none',
              }} />
            ))}
          </div>

          {/* Error */}
          <div style={{ height: 22, textAlign: 'center', marginBottom: 10 }}>
            {error && <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>⚠ {error}</span>}
          </div>

          {/* Keypad */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button key={n} type="button" onClick={() => handleNum(n.toString())}
                style={{
                  height: 52, borderRadius: 10, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', color: 'var(--text-primary)',
                  fontSize: 19, fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseDown={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseUp={e => e.currentTarget.style.background = 'var(--bg-card)'}
              >{n}</button>
            ))}
            <div />
            <button type="button" onClick={() => handleNum('0')}
              style={{
                height: 52, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg-card)', color: 'var(--text-primary)',
                fontSize: 19, fontWeight: 700, fontFamily: 'monospace', cursor: 'pointer',
              }}
            >0</button>
            <button type="button" onClick={handleDel}
              style={{
                height: 52, borderRadius: 10, border: '1px solid var(--red-border)',
                background: 'var(--red-bg)', color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              }}
            >⌫</button>
          </div>

          {/* Next / Confirm */}
          <button
            onClick={handleNext}
            disabled={loading || currentValue.length < 4}
            style={{
              width: '100%', height: 50, borderRadius: 10, border: 'none',
              background: currentValue.length >= 4 && !loading
                ? 'linear-gradient(135deg, var(--gold), var(--gold-light))'
                : 'var(--bg-elevated)',
              color: currentValue.length >= 4 && !loading ? 'var(--bg-base)' : '#374151',
              fontWeight: 900, fontSize: 14, letterSpacing: 1, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Guardando...' : step === 2 ? '✓ Guardar PIN' : 'Siguiente →'}
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
            {(forced ? [1, 2] : [0, 1, 2]).map(s => (
              <div key={s} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: s === step ? 'var(--gold)' : 'var(--border)',
                transition: 'background 0.2s',
              }} />
            ))}
          </div>

          {!forced && onClose && (
            <button onClick={onClose} style={{
              display: 'block', margin: '12px auto 0', background: 'none',
              border: 'none', color: 'var(--text-subtle)', fontSize: 12, cursor: 'pointer',
            }}>Cancelar</button>
          )}
        </div>
      </div>
    </div>
  );
}
