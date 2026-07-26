import React, { useState, useEffect, useRef } from 'react';
import { Settings, Sparkles, ShieldCheck, FileText, Plus, Zap, Clock, Lock, ClipboardCheck, Gauge, Search, Briefcase, Wind, Star, Calendar, ChevronDown, AlignLeft, BookOpen, Send, Trash2, LogOut, User } from 'lucide-react';
import axios from 'axios';

const CustomDropdown = ({ icon: Icon, options, value, onChange, badge, accentColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex-1 relative" ref={dropdownRef}>
      {badge && (
        <div className="absolute -top-3 right-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-2.5 py-0.5 rounded-full z-10 tracking-widest uppercase shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          {badge}
        </div>
      )}
      <div 
        className="glass-input cursor-pointer select-none relative group" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon className={`${accentColor} group-hover:scale-110 transition-transform duration-300`} size={18} />
        </div>
        <div className="w-full pl-12 pr-10 py-3.5 outline-none font-semibold text-[15px] text-white">
          {value}
        </div>
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
          <ChevronDown className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={18} />
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-full bg-[#0F1115] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-xl">
          {options.map((opt) => (
            <div 
              key={opt} 
              className={`px-5 py-3 text-[14px] cursor-pointer transition-colors duration-200 ${value === opt ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              onClick={() => { onChange(opt); setIsOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LoginPage = ({ onLogin }) => {
  const handleLinkedInLogin = async () => {
    try {
      const res = await axios.get('/api/auth/linkedin');
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error("Failed to get auth URL", err);
    }
  };

  const handleGoogleLogin = () => {
    // For demo purposes, we'll just simulate a Google login
    onLogin({ name: "Google User", platform: "Google" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-card w-full max-w-md p-10 relative z-10 animate-fade-in flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/[0.08]">
        
        <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-5 rounded-3xl shadow-[0_0_40px_rgba(6,182,212,0.5)] mb-8">
           <Zap size={48} className="text-white fill-white" />
        </div>
        
        <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-3">
          ClickedIn
        </h1>
        <p className="text-sm text-slate-400 mb-10 font-medium tracking-wide">Automate your professional growth. Safely.</p>

        <div className="w-full space-y-4">
          <button 
            onClick={handleLinkedInLogin}
            className="w-full flex items-center justify-center space-x-3 bg-[#0A66C2] hover:bg-[#004182] text-white py-4 rounded-2xl font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(10,102,194,0.4)] hover:shadow-[0_0_25px_rgba(10,102,194,0.6)] hover:-translate-y-1"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span>Continue with LinkedIn</span>
          </button>

          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-bold tracking-wide transition-all shadow-lg hover:shadow-white/5 hover:-translate-y-1"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ClickedInDashboard = ({ userProfile, onLogout }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState(localStorage.getItem('userWorkHistory') || '');
  const [size, setSize] = useState('Medium');
  const [tone, setTone] = useState('Professional');
  const [postCount, setPostCount] = useState(1);
  const [baseTime, setBaseTime] = useState('');
  const [hoursGap, setHoursGap] = useState(4);
  const [minutesGap, setMinutesGap] = useState(0);
  
  const [queue, setQueue] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  useEffect(() => {
    localStorage.setItem('userWorkHistory', context);
  }, [context]);

  const fetchQueue = async () => {
    try {
      const res = await axios.get('/api/posts');
      setQueue(res.data);
    } catch (err) {
      console.error("Error fetching queue", err);
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!topic) return;
    setIsGenerating(true);
    try {
      const res = await axios.post('/api/posts', {
        topic,
        context,
        size, tone, 
        count: postCount,
        baseTime,
        hoursGap,
        minutesGap
      });
      if (Array.isArray(res.data)) {
        setQueue(prev => [...prev, ...res.data]);
      } else {
        setQueue(prev => [...prev, res.data]);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Error connecting to AI generation service. Please check the backend console.";
      setQueue(prev => [...prev, {
        id: Date.now(),
        topic, size, tone, frequency,
        content: `[ERROR] ${errorMsg}`,
        status: 'draft'
      }]);
    }
    setIsGenerating(false);
  };

  const handleApprove = async (id, currentContent, scheduledTime) => {
    try {
      await axios.put(`/api/posts/${id}/approve`, { content: currentContent, scheduledTime });
      fetchQueue();
    } catch (err) {
      setQueue(prev => prev.map(p => p.id === id ? { ...p, status: 'approved', scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date() } : p));
    }
  };

  const discardDraft = (id) => {
    setQueue(prev => prev.filter(p => p.id !== id));
  };

  const cancelSchedule = async (id) => {
    try {
      await axios.put(`/api/posts/${id}/cancel`);
      fetchQueue();
    } catch (err) {
      setQueue(prev => prev.map(p => p.id === id ? { ...p, status: 'draft', scheduledTime: null } : p));
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12 flex justify-center overflow-x-hidden relative">
      
      {showExperienceModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#0F1115] border border-white/10 w-full max-w-xl rounded-3xl p-8 shadow-2xl relative animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6">Account Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Global AI Context (Work History)</label>
                <p className="text-xs text-slate-300 mb-3">LinkedIn's API prevents third-party apps from automatically reading your work history. Paste it here once, and the AI will permanently remember it in the background.</p>
                <textarea 
                  placeholder="Paste your resume summary, bio, or work history here..." 
                  className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-xl text-[14px] text-white placeholder-slate-400 focus:border-cyan-500/50 min-h-[150px] resize-y"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end pt-6 border-t border-white/5">
                <button 
                  onClick={() => setShowExperienceModal(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1200px] w-full relative z-10 animate-fade-in">
        
        {/* Header */}
        <header className="relative z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 group cursor-pointer">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-3 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-300">
               <Zap size={28} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                ClickedIn
              </h1>
              <p className="text-cyan-400/80 text-xs font-bold tracking-[0.2em] uppercase mt-1">AI Automation Engine</p>
            </div>
          </div>

          <div className="flex items-center bg-white/[0.02] p-1.5 rounded-full border border-white/10 backdrop-blur-xl shadow-lg hover:bg-white/[0.04] transition-colors duration-300">
             <div className="flex items-center pl-4 pr-3 py-1 border-r border-white/10">
               <div className="relative flex h-2 w-2 mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </div>
               <span className="text-[13px] font-semibold text-slate-200 tracking-wide">{userProfile?.name}</span>
             </div>
             
             <div className="relative">
               <button 
                 onClick={() => setShowSettings(!showSettings)}
                 className="px-4 text-slate-400 hover:text-cyan-400 transition-colors h-full flex items-center"
               >
                 <Settings size={16} className={showSettings ? "text-cyan-400 rotate-90 transition-all" : "transition-all"} />
               </button>
               
               {showSettings && (
                 <div className="absolute top-full mt-4 right-0 w-64 bg-[#0F1115] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-xl animate-fade-in flex flex-col">
                    <button 
                      onClick={() => {
                        setShowSettings(false);
                        setShowExperienceModal(true);
                      }}
                      className="w-full text-left px-5 py-4 text-[14px] text-white hover:bg-white/5 font-bold transition-colors border-b border-white/5 flex items-center space-x-3"
                    >
                       <User size={16} className="text-cyan-400" />
                       <span>Add Relevant Experience</span>
                    </button>
                    <button 
                      onClick={onLogout} 
                      className="w-full text-left px-5 py-4 text-[14px] text-red-400 hover:bg-white/5 hover:text-red-300 font-bold transition-colors flex items-center space-x-3"
                    >
                       <LogOut size={16} />
                       <span>Disconnect Account</span>
                    </button>
                 </div>
               )}
             </div>
             
             <div className="relative group cursor-pointer">
               {userProfile?.pictureUrl ? (
                 <img src={userProfile.pictureUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-white/10 group-hover:border-cyan-500/50 transition-colors" />
               ) : (
                 <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold flex items-center justify-center border-2 border-white/10 group-hover:border-cyan-500/50 transition-colors uppercase">
                   {userProfile?.name ? userProfile.name.charAt(0) : '?'}
                 </div>
               )}
             </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto w-full">
          
          {/* Main Column */}
          <div className="flex flex-col space-y-8">
            
            {/* Post Assistant Card */}
            <div className="glass-card z-20">
              <div className="bg-white/[0.03] border-b border-white/[0.05] px-8 py-5 flex items-center space-x-3 rounded-t-3xl">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Sparkles size={20} className="text-cyan-400" />
                </div>
                <h2 className="font-bold tracking-widest text-[13px] text-white uppercase">Post Assistant</h2>
              </div>
              
              <div className="p-8 space-y-8">
                
                {/* Topic Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Topic / Theme</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="text-slate-500 group-focus-within:text-cyan-400 transition-colors duration-300" size={20} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g., The Future of AI in SaaS..." 
                      className="w-full pl-12 pr-4 py-4 glass-input text-[16px] text-white placeholder-slate-600 font-medium"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  <p className="mt-3 text-xs text-slate-400 flex items-center space-x-1.5">
                    <Sparkles size={12} className="text-amber-400" />
                    <span><strong className="text-slate-300">Pro Tip:</strong> Click the Settings (⚙️) icon above to add your prior experience. It helps the AI write significantly better, personalized posts!</span>
                  </p>
                </div>



                {/* Grid for Size and Tone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Post Size */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Post Size</label>
                    <div className="flex space-x-3">
                      {[
                        { id: 'Short', icon: Zap },
                        { id: 'Medium', icon: BookOpen },
                        { id: 'Long', icon: AlignLeft }
                      ].map(item => (
                        <button 
                          key={item.id}
                          onClick={() => setSize(item.id)}
                          className={`flex-1 glass-btn ${size === item.id ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
                        >
                          <item.icon size={16} className={size === item.id ? "text-cyan-400" : "text-slate-500"} />
                          <span>{item.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tone */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Tone</label>
                    <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-hide">
                      {[
                        { id: 'Professional', icon: Briefcase },
                        { id: 'Casual', icon: Wind },
                        { id: 'Thought Leadership', icon: Star }
                      ].map(item => (
                        <button 
                          key={item.id}
                          onClick={() => setTone(item.id)}
                          className={`px-5 glass-btn whitespace-nowrap ${tone === item.id ? 'bg-purple-500/20 border-purple-500/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
                        >
                          <item.icon size={16} className={tone === item.id ? "text-purple-400" : "text-slate-500"} />
                          <span>{item.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scheduling Config */}
                <div className="pt-6 border-t border-white/5 space-y-6">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Number of Posts</label>
                    <div className="flex space-x-3">
                      {[1, 2, 3].map(num => (
                        <button 
                          key={num}
                          onClick={() => setPostCount(num)}
                          className={`flex-1 glass-btn ${postCount === num ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]' : 'bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white'}`}
                        >
                          <span>{num} {num === 1 ? 'Post' : 'Posts'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {postCount > 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Start Date & Time</label>
                        <input 
                          type="datetime-local" 
                          style={{ colorScheme: 'dark' }}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                          value={baseTime}
                          onChange={(e) => setBaseTime(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest">Gap Between Posts</label>
                        <div className="flex space-x-4">
                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-500 mb-1">Hours</label>
                            <input 
                              type="number" 
                              min="0"
                              max="72"
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-cyan-500/50"
                              value={hoursGap}
                              onChange={(e) => setHoursGap(Number(e.target.value))}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] text-slate-500 mb-1">Minutes</label>
                            <input 
                              type="number" 
                              min="0"
                              max="59"
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white focus:outline-none focus:border-cyan-500/50"
                              value={minutesGap}
                              onChange={(e) => setMinutesGap(Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic}
                  className="w-full mt-4 flex items-center justify-center space-x-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-4 rounded-2xl font-bold tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 disabled:pointer-events-none disabled:transform-none uppercase"
                >
                  {isGenerating ? (
                    <span className="animate-pulse flex items-center space-x-2">
                      <Sparkles size={20} className="animate-spin" />
                      <span>Synthesizing Draft...</span>
                    </span>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>Generate Content Queue</span>
                    </>
                  )}
                </button>
                
              </div>
            </div>

            {/* Draft Queue Card */}
            <div className="glass-card min-h-[400px] flex flex-col">
              <div className="bg-white/[0.03] border-b border-white/[0.05] px-8 py-5 flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FileText size={20} className="text-purple-400" />
                  </div>
                  <h2 className="font-bold tracking-widest text-[13px] text-white uppercase">Staging Area</h2>
                </div>
                <div className="bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  {queue.length} {queue.length === 1 ? 'Draft' : 'Drafts'}
                </div>
              </div>
              
              <div className="p-8 flex-1 flex flex-col">
                {queue.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                    <div className="relative w-32 h-32 mb-8">
                       <div className="absolute inset-0 border-2 border-dashed border-slate-700 rounded-full animate-[spin_10s_linear_infinite]"></div>
                       <div className="absolute inset-2 border-2 border-dashed border-slate-600 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                       <div className="absolute inset-0 flex items-center justify-center">
                         <FileText size={40} className="text-slate-600 opacity-50" />
                       </div>
                    </div>
                    <h3 className="text-white font-bold text-xl tracking-wide mb-2">Queue is Empty</h3>
                    <p className="text-slate-400 text-sm">Generate a draft above to populate the staging area.</p>
                  </div>
                ) : (
                   <div className="space-y-6">
                      {queue.map(post => (
                        <div key={post.id} className={`p-6 rounded-2xl border ${post.status === 'draft' ? 'bg-white/[0.03] border-white/10' : 'bg-emerald-500/10 border-emerald-500/20'} transition-all duration-300 hover:border-cyan-500/30`}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 space-y-3 sm:space-y-0">
                            <div className="flex items-center space-x-3">
                              <span className="text-[10px] font-bold text-white bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/10">
                                {post.topic}
                              </span>
                              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-cyan-500/20">
                                {post.tone}
                              </span>
                              <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-purple-500/20">
                                {post.size}
                              </span>
                            </div>
                            
                            {post.status === 'draft' ? (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full uppercase tracking-widest border border-amber-500/20 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 animate-pulse"></span>
                                Pending Review
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full flex items-center uppercase tracking-widest border border-emerald-500/20">
                                <Clock size={12} className="mr-2" />
                                Scheduled: {new Date(post.scheduledTime).toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <textarea 
                            className="w-full h-36 bg-black/20 border border-white/5 rounded-xl p-4 text-[15px] focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/10 mb-4 resize-none text-slate-300 font-medium leading-relaxed transition-all"
                            defaultValue={post.content}
                            id={`content-${post.id}`}
                            spellCheck="false"
                          />
                          
                          <div className="flex justify-end items-center space-x-4">
                            {post.status === 'draft' && (
                              <>
                                <input 
                                  type="datetime-local" 
                                  id={`time-${post.id}`} 
                                  defaultValue={post.scheduledTime ? new Date(new Date(post.scheduledTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                                  style={{ colorScheme: 'dark' }}
                                  className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                                />
                                <button 
                                  onClick={() => discardDraft(post.id)}
                                  className="flex items-center space-x-1.5 text-sm font-semibold text-slate-400 hover:text-red-400 transition-colors px-2 py-2 rounded-lg hover:bg-red-500/10"
                                >
                                  <Trash2 size={16} />
                                  <span>Discard</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    const timeVal = document.getElementById(`time-${post.id}`).value;
                                    if (!timeVal) {
                                      alert("Please select a date and time before scheduling!");
                                      return;
                                    }
                                    handleApprove(post.id, document.getElementById(`content-${post.id}`).value, timeVal);
                                  }}
                                  className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-white/10 border border-white/10"
                                >
                                  <Send size={16} className="text-cyan-400" />
                                  <span>Approve & Schedule</span>
                                </button>
                              </>
                            )}
                            {post.status === 'approved' && (
                              <button 
                                onClick={() => cancelSchedule(post.id)}
                                className="flex items-center space-x-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors px-4 py-2 rounded-lg hover:bg-amber-500/10 border border-amber-500/20"
                              >
                                <span>Cancel Schedule</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                )}
              </div>
            </div>

          
        </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'linkedin_connected') {
      setIsAuthenticated(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get('/api/auth/status');
      if (res.data.connected) {
        setIsAuthenticated(true);
        setUserProfile(res.data.profile);
      }
    } catch (err) {
      console.error("Auth status error", err);
    }
  };

  const handleLogin = (profile) => {
    setIsAuthenticated(true);
    setUserProfile(profile);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setIsAuthenticated(false);
      setUserProfile(null);
      // Remove any OAuth URL params so we don't automatically log back in on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <ClickedInDashboard userProfile={userProfile} onLogout={handleLogout} />;
}
