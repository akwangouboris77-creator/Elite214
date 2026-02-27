import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  User as UserIcon, 
  Play, 
  CreditCard, 
  LayoutDashboard, 
  LogOut, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ChevronRight,
  Upload,
  MapPin,
  ShieldCheck,
  Zap,
  Bell,
  Send,
  Calendar
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useDropzone } from 'react-dropzone';
import confetti from 'canvas-confetti';

import { User, Subscription, Question, Score, AdminStats, AppNotification, DistrictRanking } from './types';
import { DISTRICTS, ADMIN_PHONE, SUBSCRIPTION_FEE } from './constants';

// --- Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, type = 'button' }: any) => {
  const base = "px-6 py-3 rounded-none transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "brutalist-button-primary",
    secondary: "bg-white text-elite-black border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-black uppercase tracking-widest",
    accent: "brutalist-button-accent",
    success: "brutalist-button-success",
    danger: "bg-red-500 text-white border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] font-black uppercase tracking-widest",
  };
  
  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '', title, variant = 'default' }: any) => {
  const variants: any = {
    default: "brutalist-card",
    blue: "bg-gabon-blue/5 border-[3px] border-elite-black shadow-[8px_8px_0px_0px_rgba(58,117,196,1)]",
    yellow: "bg-gabon-yellow/5 border-[3px] border-elite-black shadow-[8px_8px_0px_0px_rgba(252,209,22,1)]",
    green: "bg-gabon-green/5 border-[3px] border-elite-black shadow-[8px_8px_0px_0px_rgba(0,158,96,1)]",
  };

  return (
    <div className={`${variants[variant]} p-6 ${className}`}>
      {title && <h3 className="font-black text-2xl mb-6 uppercase italic border-b-[3px] border-elite-black pb-3 tracking-tight">{title}</h3>}
      {children}
    </div>
  );
};

// --- Views ---

const AuthView = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [phone, setPhone] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [district, setDistrict] = useState(DISTRICTS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pseudo, district }),
      });
      const data = await res.json();
      onLogin(data);
    } catch (err) {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gabon-blue/10 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gabon-yellow border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] mb-4">
             <Zap size={40} className="text-elite-black fill-elite-black" />
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">L’ÉLITE<br/><span className="text-gabon-green">241</span></h1>
        </div>
        <Card title="CONNEXION GUERRIER">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase mb-2 tracking-widest">Numéro Airtel/Moov</label>
              <input 
                type="tel" 
                required
                placeholder="077 00 00 00"
                className="w-full p-4 border-[3px] border-elite-black focus:outline-none focus:bg-gabon-blue/5 font-bold"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-2 tracking-widest">Pseudo (Nom de Guerrier)</label>
              <input 
                type="text" 
                required
                placeholder="Ex: LeGénieDu241"
                className="w-full p-4 border-[3px] border-elite-black focus:outline-none focus:bg-gabon-blue/5 font-bold"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-2 tracking-widest">Ton Quartier</label>
              <select 
                className="w-full p-4 border-[3px] border-elite-black focus:outline-none focus:bg-gabon-blue/5 font-bold appearance-none bg-white"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              >
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full mt-4" disabled={loading} variant="primary">
              {loading ? 'Chargement...' : 'Entrer dans l’Arène'}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

const DashboardView = ({ user, subscription, onNavigate }: any) => {
  const isSubscribed = subscription && subscription.status === 'validated';
  const [topDistrict, setTopDistrict] = useState<DistrictRanking | null>(null);
  const [arenaOpen, setArenaOpen] = useState(false);

  useEffect(() => {
    fetch('/api/rankings/districts', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.length > 0) setTopDistrict(data[0]);
    });

    fetch('/api/arena/status')
    .then(res => res.json())
    .then(data => setArenaOpen(data.isOpen));

    const socket = io();
    socket.on('arena_status_change', (data: any) => {
      setArenaOpen(data.isOpen);
    });

    return () => { socket.disconnect(); };
  }, []);
  
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-5xl font-black italic uppercase leading-none">Salut, <span className="text-gabon-blue">{user.pseudo}</span></h1>
          <p className="text-zinc-500 font-mono text-sm flex items-center gap-1 mt-2">
            <MapPin size={14} className="text-gabon-green" /> {user.district}
          </p>
        </div>
        {user.is_admin === 1 && (
          <Button variant="secondary" onClick={() => onNavigate('admin')} className="flex items-center gap-2 w-full md:w-auto">
            <ShieldCheck size={18} /> Dashboard Admin
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {topDistrict && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gabon-yellow border-[3px] border-elite-black p-4 shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] flex items-center justify-between lg:col-span-2"
          >
            <div className="flex items-center gap-3">
              <Trophy className="text-elite-black" size={24} />
              <div>
                <p className="text-[10px] font-black uppercase opacity-60 leading-none">Quartier le plus instruit</p>
                <p className="text-xl font-black uppercase italic">{topDistrict.district}</p>
              </div>
            </div>
            <Button variant="secondary" className="py-1 px-3 text-[10px]" onClick={() => onNavigate('districts')}>
              Voir Classement
            </Button>
          </motion.div>
        )}

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${arenaOpen ? 'bg-gabon-green' : 'bg-red-500'} text-white border-[3px] border-elite-black p-4 shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] flex items-center gap-3`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white ${arenaOpen ? 'animate-pulse' : ''}`}>
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase opacity-80 leading-none">État de l'Arène</p>
            <p className="text-xl font-black uppercase italic">{arenaOpen ? 'OUVERTE' : 'FERMÉE'}</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Statut Abonnement" variant={isSubscribed ? 'green' : 'default'}>
          <div className="flex items-center gap-4 mb-6">
            {isSubscribed ? (
              <div className="bg-gabon-green text-white px-4 py-2 border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] flex items-center gap-2 font-black uppercase text-sm">
                <CheckCircle size={20} /> COMPTE ACTIF
              </div>
            ) : (
              <div className="bg-red-500 text-white px-4 py-2 border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] flex items-center gap-2 font-black uppercase text-sm">
                <AlertCircle size={20} /> COMPTE INACTIF
              </div>
            )}
            {subscription?.status === 'pending' && (
              <div className="bg-gabon-yellow text-elite-black px-4 py-2 border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] flex items-center gap-2 font-black uppercase text-sm">
                <Clock size={20} /> EN ATTENTE
              </div>
            )}
          </div>
          
          {isSubscribed ? (
            <div className="bg-white p-4 border-[3px] border-elite-black font-mono text-sm">
               <p className="opacity-60 uppercase text-[10px] font-bold mb-1">Expiration</p>
               <p className="font-black">{new Date(subscription.expires_at).toLocaleString()}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm mb-6 font-medium leading-relaxed">Abonne-toi pour <span className="font-black">1 000 FCFA</span> pour accéder aux défis et gagner des prix réels !</p>
              <Button variant="accent" onClick={() => onNavigate('subscribe')} className="w-full">
                S'abonner maintenant
              </Button>
            </div>
          )}
        </Card>

        <Card title="Prêt pour le Défi ?" variant="blue">
          <p className="text-sm mb-8 leading-relaxed">Le prochain grand quiz commence bientôt. Prépare tes neurones pour remporter la cagnotte de la semaine !</p>
          <Button 
            variant="primary"
            className="w-full flex items-center justify-center gap-3 py-4 text-xl" 
            disabled={(!isSubscribed && user.is_admin !== 1) || (!arenaOpen && user.is_admin !== 1)}
            onClick={() => onNavigate('quiz')}
          >
            <Play size={24} fill="currentColor" /> LANCER LE QUIZ
          </Button>
          {!arenaOpen && user.is_admin !== 1 && (
            <p className="text-[10px] text-red-600 mt-3 text-center uppercase font-black tracking-widest">L'Arène est fermée pour le moment</p>
          )}
          {arenaOpen && !isSubscribed && user.is_admin !== 1 && (
            <p className="text-[10px] text-red-600 mt-3 text-center uppercase font-black tracking-widest">Abonnement requis pour jouer</p>
          )}
        </Card>
      </div>

      <Card title="Top 5 - Live Ranking" variant="yellow">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-white border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] font-mono text-sm">
            <span className="font-black text-lg">1. LeGénieDu241</span>
            <span className="bg-gabon-blue text-white px-3 py-1 font-black">950 PTS</span>
          </div>
          <div className="flex items-center justify-between p-4 bg-white border-[3px] border-elite-black shadow-[4px_4px_0px_0px_rgba(10,10,10,1)] font-mono text-sm">
            <span className="font-black text-lg">2. MathMaster</span>
            <span className="bg-gabon-blue text-white px-3 py-1 font-black">920 PTS</span>
          </div>
          <Button variant="secondary" className="w-full mt-6" onClick={() => onNavigate('ranking')}>
            Voir tout le classement national
          </Button>
        </div>
      </Card>
    </div>
  );
};

const SubscriptionView = ({ onBack }: any) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = (acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] } as any,
    multiple: false 
  } as any);

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('screenshot', file);

    try {
      const res = await fetch('/api/subscription/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (res.ok) {
        alert('Preuve envoyée ! Un admin va valider ton accès.');
        onBack();
      }
    } catch (err) {
      alert('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Button variant="secondary" onClick={onBack} className="mb-4">Retour</Button>
      <Card title="Activation de l'Abonnement">
        <div className="space-y-4">
          <div className="bg-zinc-100 p-4 border-l-4 border-black">
            <p className="text-xs font-bold uppercase mb-1">Étape 1 : Transfert Mobile Money</p>
            <p className="text-lg font-black">Envoyez 1 000 FCFA au :</p>
            <p className="text-2xl font-black text-emerald-600">{ADMIN_PHONE}</p>
            <p className="text-xs opacity-60 mt-1">(Airtel Money ou Moov Money)</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase">Étape 2 : Téléverser la preuve</p>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed border-black p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'bg-zinc-100' : 'bg-white'}`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto mb-2 opacity-40" size={32} />
              {file ? (
                <p className="font-bold">{file.name}</p>
              ) : (
                <p className="text-sm">Glisse la capture d'écran du SMS de confirmation ici ou clique pour choisir</p>
              )}
            </div>
          </div>

          <Button 
            variant="accent" 
            className="w-full" 
            disabled={!file || loading}
            onClick={handleSubmit}
          >
            {loading ? 'Envoi en cours...' : 'Valider mon abonnement'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

const QuizView = ({ onComplete }: any) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTime, setTotalTime] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0 && !finished) {
      startTimer();
    }
    return () => clearInterval(timerRef.current);
  }, [currentIndex, questions, finished]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch('/api/quiz/questions', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuestions(data);
    } catch (err: any) {
      alert(err.message);
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    clearInterval(timerRef.current);
    setTimeLeft(10);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAnswer(-1); // Timeout
          return 0;
        }
        return prev - 1;
      });
      setTotalTime(prev => prev + 1);
    }, 1000);
  };

  const handleAnswer = (index: number) => {
    const q = questions[currentIndex];
    if (index === q.correct_index) {
      setScore(prev => prev + 100 + (timeLeft * 10)); // Bonus for speed
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setFinished(true);
    clearInterval(timerRef.current);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Submit score
    await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ score, totalTime, sessionId: Date.now().toString() }),
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64 font-black">CHARGEMENT DE L'ARÈNE...</div>;

  if (finished) {
    return (
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center space-y-6"
      >
        <Trophy size={80} className="mx-auto text-amber-500" />
        <h2 className="text-5xl font-black italic uppercase">Défi Terminé !</h2>
        <div className="bg-black text-white p-8 inline-block border-4 border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-sm uppercase font-bold opacity-70">Ton Score Final</p>
          <p className="text-6xl font-black">{score} PTS</p>
        </div>
        <div className="flex justify-center gap-4">
          <Button onClick={onComplete}>Retour au menu</Button>
        </div>
      </motion.div>
    );
  }

  const currentQ = questions[currentIndex];
  const options = JSON.parse(currentQ.options);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="font-black text-xl">QUESTION {currentIndex + 1}/{questions.length}</div>
        <div className={`w-16 h-16 rounded-full border-4 border-black flex items-center justify-center text-2xl font-black ${timeLeft < 4 ? 'bg-red-500 text-white animate-pulse' : 'bg-white'}`}>
          {timeLeft}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
        >
          <Card className="min-h-[400px] flex flex-col justify-between">
            <div>
              <span className="bg-black text-white px-2 py-1 text-[10px] font-bold uppercase mb-4 inline-block tracking-widest">
                {currentQ.category}
              </span>
              <h2 className="text-3xl font-black leading-tight mb-8">{currentQ.question}</h2>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className="w-full p-4 border-2 border-black text-left font-bold hover:bg-black hover:text-white transition-all active:scale-95 flex justify-between items-center group"
                >
                  {opt}
                  <ChevronRight size={18} className="opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 h-2 bg-zinc-200 border border-black">
        <motion.div 
          className="h-full bg-black"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

const RankingView = ({ onBack }: any) => {
  const [rankings, setRankings] = useState<Score[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io();
    socketRef.current.emit('join_ranking');
    socketRef.current.on('ranking_update', (data: Score[]) => {
      setRankings(data);
    });

    // Initial fetch
    fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(data => {
      setRankings(data.rankings);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="secondary" onClick={onBack} className="mb-4">Retour</Button>
      <Card title="Classement National - L'ÉLITE 241">
        <div className="space-y-3">
          {rankings.map((r, i) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              key={i} 
              className={`flex items-center justify-between p-4 border-2 border-black ${i === 0 ? 'bg-amber-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]' : 'bg-white'}`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black italic w-8">#{i + 1}</span>
                <div>
                  <p className="font-black uppercase">{r.pseudo}</p>
                  <p className="text-[10px] font-mono opacity-60 flex items-center gap-1">
                    <MapPin size={10} /> {r.district}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-xl">{r.score} <span className="text-xs uppercase opacity-50">pts</span></p>
                <p className="text-[10px] font-mono opacity-60">{r.total_time}s</p>
              </div>
            </motion.div>
          ))}
          {rankings.length === 0 && <p className="text-center py-8 font-mono opacity-50">Aucun score enregistré pour le moment...</p>}
        </div>
      </Card>
    </div>
  );
};

const AdminView = ({ onBack }: any) => {
  const [pendingSubs, setPendingSubs] = useState<any[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTime, setNotifTime] = useState('');
  const [pendingNotifs, setPendingNotifs] = useState<AppNotification[]>([]);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [arenaOpen, setArenaOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchArenaStatus();
  }, []);

  const fetchArenaStatus = async () => {
    const res = await fetch('/api/arena/status');
    const data = await res.json();
    setArenaOpen(data.isOpen);
  };

  const toggleArena = async () => {
    const res = await fetch('/api/admin/arena/toggle', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}` 
      },
      body: JSON.stringify({ isOpen: !arenaOpen }),
    });
    if (res.ok) {
      setArenaOpen(!arenaOpen);
    }
  };

  const fetchData = async () => {
    try {
      const [subsRes, statsRes, notifsRes] = await Promise.all([
        fetch('/api/admin/subscriptions', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/admin/notifications/pending', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setPendingSubs(await subsRes.json());
      setStats(await statsRes.json());
      setPendingNotifs(await notifsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (subId: number, action: string) => {
    await fetch('/api/admin/subscriptions/validate', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ subId, action }),
    });
    fetchData();
  };

  const handleScheduleNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/notifications/schedule', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ title: notifTitle, message: notifMessage, scheduledAt: notifTime }),
    });
    setNotifTitle('');
    setNotifMessage('');
    setNotifTime('');
    fetchData();
    alert('Notification programmée !');
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="space-y-8">
      <Button variant="secondary" onClick={onBack}>Retour</Button>

      {/* Image Modal */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={viewingImage} 
              className="max-w-full max-h-full border-4 border-white shadow-2xl"
              alt="Full Proof"
            />
            <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full">
              <LogOut size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-500 text-white border-black">
          <p className="text-xs font-bold uppercase opacity-80">Pot Total</p>
          <p className="text-4xl font-black">{stats?.totalPot.toLocaleString()} FCFA</p>
        </Card>
        <Card className="bg-black text-white">
          <p className="text-xs font-bold uppercase opacity-80">Cagnotte Gagnants (60%)</p>
          <p className="text-4xl font-black">{stats?.winnersPot.toLocaleString()} FCFA</p>
        </Card>
        <Card className="bg-zinc-200 border-black">
          <p className="text-xs font-bold uppercase opacity-80">Part Admin (40%)</p>
          <p className="text-4xl font-black">{stats?.adminPot.toLocaleString()} FCFA</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Validation des Abonnements">
          <div className="space-y-4">
            {pendingSubs.map(sub => (
              <div key={sub.id} className="border-2 border-black p-4 flex flex-col gap-4 bg-zinc-50">
                <div className="flex gap-4">
                  <div 
                    className="w-24 h-24 border-2 border-black bg-white flex-shrink-0 cursor-pointer overflow-hidden group relative"
                    onClick={() => setViewingImage(sub.screenshot_url)}
                  >
                    <img src={sub.screenshot_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Zap size={20} className="text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-black uppercase text-lg leading-tight">{sub.pseudo}</p>
                    <p className="text-sm font-mono text-zinc-600 mb-2">{sub.phone}</p>
                    <div className="flex gap-2">
                      <Button variant="accent" className="flex-1 py-1 text-[10px]" onClick={() => handleAction(sub.id, 'validate')}>Valider</Button>
                      <Button variant="danger" className="flex-1 py-1 text-[10px]" onClick={() => handleAction(sub.id, 'reject')}>Rejeter</Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {pendingSubs.length === 0 && <p className="text-center py-4 font-mono opacity-50">Aucune demande en attente</p>}
          </div>
        </Card>

        <Card title="Contrôle de l'Arène" variant={arenaOpen ? 'green' : 'default'}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold uppercase opacity-60 mb-1">Session de Quiz</p>
              <p className="text-2xl font-black italic uppercase">{arenaOpen ? 'Arène Ouverte' : 'Arène Fermée'}</p>
            </div>
            <Button 
              variant={arenaOpen ? 'danger' : 'success'} 
              onClick={toggleArena}
              className="flex items-center gap-2"
            >
              <Zap size={20} fill="currentColor" />
              {arenaOpen ? 'FERMER L’ARÈNE' : 'OUVRIR L’ARÈNE'}
            </Button>
          </div>
          <p className="text-[10px] mt-4 font-mono opacity-60 italic">
            * L'ouverture de l'arène permet à tous les abonnés de lancer le quiz simultanément.
          </p>
        </Card>

        <Card title="Classement des Quartiers">
          <div className="space-y-2">
            {stats?.districtRankings.map((r, i) => (
              <div key={r.district} className="flex items-center justify-between p-3 border-2 border-black bg-white font-mono text-xs">
                <span className="font-bold">{i + 1}. {r.district}</span>
                <div className="flex gap-4">
                  <span>{r.player_count} Joueurs</span>
                  <span className="font-black text-gabon-blue">{r.total_score.toLocaleString()} PTS</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Programmer une Annonce">
          <form onSubmit={handleScheduleNotif} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Titre</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border-2 border-black focus:outline-none"
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Message</label>
              <textarea 
                required
                className="w-full p-2 border-2 border-black focus:outline-none h-20"
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Heure d'envoi</label>
              <input 
                type="datetime-local" 
                required
                className="w-full p-2 border-2 border-black focus:outline-none"
                value={notifTime}
                onChange={(e) => setNotifTime(e.target.value)}
              />
            </div>
            <Button className="w-full flex items-center justify-center gap-2">
              <Send size={18} /> Programmer
            </Button>
          </form>

          <div className="mt-6">
            <h4 className="font-bold uppercase text-xs mb-2">Programmées :</h4>
            <div className="space-y-2">
              {pendingNotifs.map(n => (
                <div key={n.id} className="text-[10px] border border-black p-2 flex justify-between">
                  <span>{n.title}</span>
                  <span className="font-mono">{new Date(n.scheduled_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const DistrictRankingView = ({ onBack }: any) => {
  const [rankings, setRankings] = useState<DistrictRanking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/rankings/districts', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setRankings(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button variant="secondary" onClick={onBack} className="mb-4">Retour</Button>
      <Card title="Badges de Quartier - Classement" variant="yellow">
        <p className="text-sm mb-6 font-medium italic">Quel quartier du Gabon est le plus instruit ? Les scores de tous les guerriers sont cumulés ici !</p>
        <div className="space-y-4">
          {rankings.map((r, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={r.district} 
              className={`flex items-center justify-between p-5 border-[3px] border-elite-black bg-white shadow-[4px_4px_0px_0px_rgba(10,10,10,1)]`}
            >
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 flex items-center justify-center font-black text-2xl italic border-2 border-elite-black ${i === 0 ? 'bg-gabon-yellow' : 'bg-zinc-100'}`}>
                  {i + 1}
                </div>
                <div>
                  <p className="font-black text-xl uppercase tracking-tight">{r.district}</p>
                  <p className="text-[10px] font-mono opacity-60 uppercase font-bold">{r.player_count} Guerriers actifs</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase opacity-40 leading-none mb-1">Score Total</p>
                <p className="font-black text-2xl text-gabon-blue">{r.total_score.toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
          {rankings.length === 0 && !loading && (
            <p className="text-center py-12 font-mono opacity-50 italic">Aucun quartier n'a encore marqué de points...</p>
          )}
        </div>
      </Card>
    </div>
  );
};

const NotificationsView = ({ onBack }: any) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="secondary" onClick={onBack} className="mb-4">Retour</Button>
      <Card title="Annonces & Notifications">
        <div className="space-y-4">
          {notifications.map(n => (
            <div key={n.id} className="border-2 border-black p-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className="text-emerald-500" />
                <h4 className="font-black uppercase">{n.title}</h4>
              </div>
              <p className="text-sm mb-2">{n.message}</p>
              <p className="text-[10px] font-mono opacity-50">{new Date(n.created_at).toLocaleString()}</p>
            </div>
          ))}
          {notifications.length === 0 && !loading && (
            <p className="text-center py-8 font-mono opacity-50">Aucune annonce pour le moment.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showToast, setShowToast] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    checkAuth();
    
    socketRef.current = io();
    socketRef.current.on('notification', (notif: any) => {
      setShowToast(notif);
      setTimeout(() => setShowToast(null), 5000);
      // Refresh notifications if in view
      if (view === 'notifications') {
        fetchNotifications();
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    const res = await fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setNotifications(data);
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSubscription(data.subscription);
      } else {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (data: any) => {
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setView('dashboard');
    checkAuth(); // Refresh sub status
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSubscription(null);
    setView('dashboard');
  };

  if (loading) return <div className="min-h-screen bg-elite-cream flex items-center justify-center font-black text-4xl animate-pulse italic tracking-tighter">L’ÉLITE 241...</div>;

  if (!user) return <AuthView onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-elite-cream text-elite-black font-sans selection:bg-gabon-yellow">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          >
            <div className="bg-white text-elite-black p-4 border-[3px] border-elite-black shadow-[8px_8px_0px_0px_rgba(10,10,10,1)]">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-gabon-yellow fill-gabon-yellow" />
                <h4 className="font-black uppercase text-sm">{showToast.title}</h4>
              </div>
              <p className="text-xs font-medium">{showToast.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white text-elite-black p-4 border-b-[4px] border-elite-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
            <div className="bg-gabon-yellow p-1 border-2 border-elite-black group-hover:rotate-12 transition-transform">
              <Zap className="text-elite-black fill-elite-black" size={24} />
            </div>
            <span className="text-3xl font-black italic tracking-tighter uppercase">L’ÉLITE <span className="text-gabon-green">241</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView('notifications')} className="relative p-2 hover:bg-gabon-blue/10 transition-colors border-2 border-transparent hover:border-elite-black">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-3 h-3 bg-gabon-green border-2 border-white rounded-full"></span>
            </button>
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-black uppercase opacity-40 leading-none">Guerrier</p>
              <p className="text-sm font-black">{user.pseudo}</p>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-red-500 hover:text-white transition-colors border-2 border-transparent hover:border-elite-black">
              <LogOut size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'dashboard' && (
              <DashboardView 
                user={user} 
                subscription={subscription} 
                onNavigate={setView} 
              />
            )}
            {view === 'subscribe' && <SubscriptionView onBack={() => setView('dashboard')} />}
            {view === 'quiz' && <QuizView onComplete={() => setView('dashboard')} />}
            {view === 'ranking' && <RankingView onBack={() => setView('dashboard')} />}
            {view === 'districts' && <DistrictRankingView onBack={() => setView('dashboard')} />}
            {view === 'admin' && <AdminView onBack={() => setView('dashboard')} />}
            {view === 'notifications' && <NotificationsView onBack={() => setView('dashboard')} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer / Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-6 left-4 right-4 bg-white border-[3px] border-elite-black shadow-[8px_8px_0px_0px_rgba(10,10,10,1)] flex justify-around p-3 z-50">
        <button onClick={() => setView('dashboard')} className={`p-2 transition-colors ${view === 'dashboard' ? 'bg-gabon-blue text-white' : 'hover:bg-zinc-100'}`}><LayoutDashboard /></button>
        <button onClick={() => setView('quiz')} className={`p-2 transition-colors ${view === 'quiz' ? 'bg-gabon-blue text-white' : 'hover:bg-zinc-100'}`}><Play fill="currentColor" /></button>
        <button onClick={() => setView('ranking')} className={`p-2 transition-colors ${view === 'ranking' ? 'bg-gabon-blue text-white' : 'hover:bg-zinc-100'}`}><Trophy /></button>
        <button onClick={() => setView('notifications')} className={`p-2 transition-colors ${view === 'notifications' ? 'bg-gabon-blue text-white' : 'hover:bg-zinc-100'}`}><Bell /></button>
      </nav>
      <div className="h-24 md:hidden"></div>
    </div>
  );
}
