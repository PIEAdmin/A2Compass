import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks';
import AvatarCreator, { PenguinSVG } from '../../components/shared/AvatarCreator';
import type { AvatarData } from '../../components/shared/AvatarCreator';

// ─── Constants ───────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5;

const THEME_COLORS = [
  { name: 'Blue', hex: '#0984E3' },
  { name: 'Purple', hex: '#6C5CE7' },
  { name: 'Green', hex: '#00B894' },
  { name: 'Orange', hex: '#E17055' },
  { name: 'Pink', hex: '#FD79A8' },
  { name: 'Red', hex: '#D63031' },
];

const INTERESTS = [
  { id: 'space', label: 'Stars & Space', emoji: '⭐' },
  { id: 'animals', label: 'Animals', emoji: '🐾' },
  { id: 'art', label: 'Art & Drawing', emoji: '🎨' },
  { id: 'sports', label: 'Sports', emoji: '⚽' },
  { id: 'music', label: 'Music & Dance', emoji: '🎵' },
];

const DEFAULT_AVATAR: AvatarData = {
  color: '#2D3436',
  colorName: 'Classic',
  hat: 'none',
  eyewear: 'sunglasses',
  accessory: 'none',
};

// ─── Confetti Component ──────────────────────────────────────────────────────

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6', '#E67E22', '#FD79A8', '#00CEC9'];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      shape: i % 3, // 0=circle, 1=square, 2=triangle
    }));
  }, []);

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        {pieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: '-20px',
              width: `${p.size}px`,
              height: p.shape === 0 ? `${p.size}px` : `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '2px' : '0',
              clipPath: p.shape === 2 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s infinite`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// ─── Waving Pepper Mascot ────────────────────────────────────────────────────

function WavingPepper() {
  return (
    <>
      <style>{`
        @keyframes pepper-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pepper-wave {
          0%, 100% { transform: rotate(-10deg); }
          50% { transform: rotate(25deg); }
        }
      `}</style>
      <div style={{ animation: 'pepper-bounce 2s ease-in-out infinite' }}>
        <svg
          viewBox="0 0 200 220"
          width={220}
          height={242}
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }}
        >
          {/* Body */}
          <ellipse cx="100" cy="120" rx="48" ry="62" fill="#2D3436" />
          {/* Belly */}
          <ellipse cx="100" cy="128" rx="32" ry="48" fill="white" />

          {/* Left flipper (still) */}
          <ellipse
            cx="54" cy="125"
            rx="12" ry="32"
            fill="#2D3436"
            transform="rotate(-10 54 125)"
          />

          {/* Right flipper (waving!) */}
          <g style={{ transformOrigin: '146px 105px', animation: 'pepper-wave 1s ease-in-out infinite' }}>
            <ellipse
              cx="146" cy="108"
              rx="12" ry="32"
              fill="#2D3436"
              transform="rotate(-40 146 108)"
            />
          </g>

          {/* Feet */}
          <ellipse cx="82" cy="183" rx="16" ry="7" fill="#E17055" />
          <ellipse cx="118" cy="183" rx="16" ry="7" fill="#E17055" />

          {/* Head */}
          <ellipse cx="100" cy="72" rx="38" ry="34" fill="#2D3436" />
          {/* White face */}
          <ellipse cx="100" cy="78" rx="26" ry="22" fill="white" />

          {/* Eyes */}
          <ellipse cx="85" cy="76" rx="6" ry="7" fill="white" />
          <ellipse cx="115" cy="76" rx="6" ry="7" fill="white" />
          <circle cx="86" cy="75" r="4" fill="#2D3436" />
          <circle cx="116" cy="75" r="4" fill="#2D3436" />
          <circle cx="88" cy="73" r="1.5" fill="white" />
          <circle cx="118" cy="73" r="1.5" fill="white" />

          {/* Beak (smiling) */}
          <polygon points="95,90 100,98 105,90" fill="#E17055" />
          <path d="M92 96 Q100 102 108 96" stroke="#E17055" strokeWidth="2" fill="none" />

          {/* Cheeks */}
          <ellipse cx="74" cy="88" rx="8" ry="5" fill="#FECDD3" opacity="0.6" />
          <ellipse cx="126" cy="88" rx="8" ry="5" fill="#FECDD3" opacity="0.6" />

          {/* Party hat for Pepper */}
          <polygon points="78,44 100,2 122,44" fill="#6C5CE7" />
          <line x1="86" y1="30" x2="114" y2="30" stroke="#F1C40F" strokeWidth="3" />
          <line x1="82" y1="37" x2="118" y2="37" stroke="#FD79A8" strokeWidth="3" />
          <circle cx="100" cy="2" r="5" fill="#F1C40F" />
        </svg>
      </div>
    </>
  );
}

// ─── Step Progress Indicator ─────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        padding: '16px 0',
      }}
    >
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isComplete = step < current;
        return (
          <div
            key={step}
            style={{
              width: isActive ? '36px' : '12px',
              height: '12px',
              borderRadius: '6px',
              background: isActive
                ? 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)'
                : isComplete
                ? '#6C5CE7'
                : '#DFE6E9',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: isActive ? '0 2px 8px rgba(108,92,231,0.4)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main StudentWelcome Component ───────────────────────────────────────────

export default function StudentWelcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [avatarData, setAvatarData] = useState<AvatarData>(DEFAULT_AVATAR);
  const [themeColor, setThemeColor] = useState<string>('#0984E3');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'in' | 'out'>('in');

  // Load student profile to check welcome_completed
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('welcome_completed, first_name, avatar_data, theme_color, interests')
        .eq('user_id', user.id)
        .single();

      if (data?.welcome_completed) {
        navigate('/student', { replace: true });
        return;
      }

      if (data?.first_name) {
        setStudentName(data.first_name);
      }

      // Restore any partial data
      if (data?.avatar_data) {
        setAvatarData(data.avatar_data as AvatarData);
      }
      if (data?.theme_color) {
        setThemeColor(data.theme_color);
      }
      if (data?.interests) {
        setSelectedInterests(data.interests as string[]);
      }
    };

    loadProfile();
  }, [user, navigate]);

  const goNext = useCallback(() => {
    setSlideDirection('out');
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
      setSlideDirection('in');
    }, 200);
  }, []);

  const goBack = useCallback(() => {
    setSlideDirection('out');
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 1));
      setSlideDirection('in');
    }, 200);
  }, []);

  const toggleInterest = useCallback((id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleFinish = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('student_profiles')
        .update({
          avatar_data: avatarData,
          theme_color: themeColor,
          interests: selectedInterests,
          welcome_completed: true,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error saving profile:', error);
        // Still navigate — don't block the student
      }

      navigate('/student', { replace: true });
    } catch (err) {
      console.error('Error finishing onboarding:', err);
      navigate('/student', { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Step backgrounds ──────────────────────────────────────────────────────

  const stepBackgrounds: Record<number, string> = {
    1: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 30%, #0984E3 100%)',
    2: 'linear-gradient(135deg, #FFECD2 0%, #FCB69F 100%)',
    3: 'linear-gradient(135deg, #A8E6CF 0%, #88D8A8 50%, #6CB4EE 100%)',
    4: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 50%, #FFCC80 100%)',
    5: 'linear-gradient(135deg, #E8F8F5 0%, #D5F5E3 50%, #ABEBC6 100%)',
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(108,92,231,0.3); }
          50% { box-shadow: 0 0 40px rgba(108,92,231,0.6); }
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          background: stepBackgrounds[step],
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: 'background 0.6s ease',
          fontFamily: "'Inter', 'Nunito', system-ui, sans-serif",
          overflow: 'auto',
        }}
      >
        {/* Step Progress */}
        <div style={{ width: '100%', maxWidth: '500px', paddingTop: '20px' }}>
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </div>

        {/* Step Content */}
        <div
          key={step}
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: step === 2 ? 'flex-start' : 'center',
            animation: slideDirection === 'in'
              ? 'slide-in 0.4s ease forwards'
              : 'slide-out 0.2s ease forwards',
          }}
        >
          {/* ── Step 1: Welcome ───────────────────────────────────── */}
          {step === 1 && (
            <>
              <WavingPepper />

              <div
                style={{
                  marginTop: '24px',
                  textAlign: 'center',
                }}
              >
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: 'white',
                    marginBottom: '12px',
                    textShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    lineHeight: 1.3,
                  }}
                >
                  Welcome to A² Compass! <br />
                  I'm Pepper the Penguin! 🐧
                </h1>
                <p
                  style={{
                    fontSize: '18px',
                    color: 'rgba(255,255,255,0.9)',
                    marginBottom: '32px',
                    lineHeight: 1.5,
                  }}
                >
                  I'll be your learning buddy on this awesome adventure!
                </p>

                <button
                  onClick={goNext}
                  style={{
                    padding: '16px 48px',
                    borderRadius: '50px',
                    border: 'none',
                    background: 'white',
                    color: '#6C5CE7',
                    fontSize: '20px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    transition: 'all 0.2s ease',
                    animation: 'pulse-glow 2s ease-in-out infinite',
                  }}
                >
                  Let's Go! 🚀
                </button>
              </div>
            </>
          )}

          {/* ── Step 2: Create Your Penguin ────────────────────────── */}
          {step === 2 && (
            <>
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#2D3436',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}
              >
                Make your very own penguin friend! 🐧✨
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: '#636E72',
                  textAlign: 'center',
                  marginBottom: '16px',
                }}
              >
                Pick a color and add cool accessories!
              </p>

              <div
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '16px',
                  width: '100%',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                }}
              >
                <AvatarCreator
                  initialData={avatarData}
                  onSave={setAvatarData}
                  onChange={setAvatarData}
                  showSaveButton={false}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '20px',
                  width: '100%',
                }}
              >
                <button
                  onClick={goBack}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    background: 'white',
                    color: '#636E72',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    // Capture current avatar state from the AvatarCreator
                    // AvatarCreator manages its own state; we need to read it
                    // We pass onSave which updates avatarData on each change
                    goNext();
                  }}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(108,92,231,0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Pick Your Colors ──────────────────────────── */}
          {step === 3 && (
            <>
              <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
                <PenguinSVG data={avatarData} size={120} />
              </div>

              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#2D3436',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}
              >
                What's your favorite color? 🌈
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: '#636E72',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                This will make your learning space look awesome!
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  width: '100%',
                  maxWidth: '320px',
                  marginBottom: '24px',
                }}
              >
                {THEME_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setThemeColor(c.hex)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '16px 8px',
                      borderRadius: '16px',
                      border:
                        themeColor === c.hex
                          ? `3px solid ${c.hex}`
                          : '3px solid transparent',
                      background:
                        themeColor === c.hex ? 'white' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      transform:
                        themeColor === c.hex ? 'scale(1.08)' : 'scale(1)',
                      boxShadow:
                        themeColor === c.hex
                          ? `0 4px 20px ${c.hex}44`
                          : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: c.hex,
                        boxShadow: `0 4px 12px ${c.hex}55`,
                        transition: 'transform 0.2s ease',
                        transform: themeColor === c.hex ? 'scale(1.1)' : 'scale(1)',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: themeColor === c.hex ? c.hex : '#636E72',
                      }}
                    >
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '320px',
                }}
              >
                <button
                  onClick={goBack}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    background: 'white',
                    color: '#636E72',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={goNext}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(108,92,231,0.35)',
                  }}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {/* ── Step 4: Your Interests ────────────────────────────── */}
          {step === 4 && (
            <>
              <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
                <PenguinSVG data={avatarData} size={120} />
              </div>

              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#2D3436',
                  textAlign: 'center',
                  marginBottom: '8px',
                }}
              >
                What do you love? 💖
              </h2>
              <p
                style={{
                  fontSize: '15px',
                  color: '#636E72',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                Pick as many as you like!
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '360px',
                  marginBottom: '24px',
                }}
              >
                {INTERESTS.map((item) => {
                  const isSelected = selectedInterests.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleInterest(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '16px 20px',
                        borderRadius: '16px',
                        border: isSelected
                          ? '3px solid #6C5CE7'
                          : '3px solid transparent',
                        background: isSelected
                          ? 'linear-gradient(135deg, #F3F0FF 0%, #EDE7FF 100%)'
                          : 'rgba(255,255,255,0.85)',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                        boxShadow: isSelected
                          ? '0 4px 20px rgba(108,92,231,0.2)'
                          : '0 2px 8px rgba(0,0,0,0.06)',
                      }}
                    >
                      <span style={{ fontSize: '32px' }}>{item.emoji}</span>
                      <span
                        style={{
                          fontSize: '17px',
                          fontWeight: isSelected ? 700 : 600,
                          color: isSelected ? '#6C5CE7' : '#2D3436',
                        }}
                      >
                        {item.label}
                      </span>
                      {isSelected && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '20px',
                            color: '#6C5CE7',
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '360px',
                }}
              >
                <button
                  onClick={goBack}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    background: 'white',
                    color: '#636E72',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={goNext}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(108,92,231,0.35)',
                  }}
                >
                  Next →
                </button>
              </div>
            </>
          )}

          {/* ── Step 5: Ready to Learn! ───────────────────────────── */}
          {step === 5 && (
            <>
              <Confetti />

              <div style={{ animation: 'float 3s ease-in-out infinite', marginBottom: '16px' }}>
                <PenguinSVG data={avatarData} size={180} />
              </div>

              <h2
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: '#2D3436',
                  textAlign: 'center',
                  marginBottom: '12px',
                  lineHeight: 1.3,
                }}
              >
                Awesome{studentName ? `, ${studentName}` : ''}! 🎉
                <br />
                You're all set for your learning adventure!
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  color: '#636E72',
                  textAlign: 'center',
                  marginBottom: '32px',
                }}
              >
                Your penguin is looking great! Let's start learning! 🌟
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  width: '100%',
                  maxWidth: '360px',
                }}
              >
                <button
                  onClick={goBack}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '14px',
                    border: '2px solid rgba(0,0,0,0.1)',
                    background: 'white',
                    color: '#636E72',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={isSaving}
                  style={{
                    flex: 2,
                    padding: '16px',
                    borderRadius: '50px',
                    border: 'none',
                    background: isSaving
                      ? '#B2BEC3'
                      : 'linear-gradient(135deg, #00B894 0%, #00CEC9 100%)',
                    color: 'white',
                    fontSize: '18px',
                    fontWeight: 800,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 30px rgba(0,184,148,0.35)',
                    transition: 'all 0.2s ease',
                    animation: isSaving ? 'none' : 'pulse-glow 2s ease-in-out infinite',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Start Learning! 🚀'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
