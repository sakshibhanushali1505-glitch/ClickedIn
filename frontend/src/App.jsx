import React, { useState, useEffect, useRef } from 'react';
import { Settings, Sparkles, ShieldCheck, FileText, Plus, Zap, Clock, Lock, ClipboardCheck, Gauge, Search, Briefcase, Wind, Star, Calendar, ChevronDown, AlignLeft, BookOpen, Send, Trash2, LogOut, User, Layers, Save, CheckCircle, Users, Play, ShieldAlert, Check, X } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import ActivityTracker from './components/ActivityTracker';
import AdminPanel from './pages/AdminPanel';
import { trackActivity } from './lib/activity';

// Send session cookie on every API call (multi-user auth)
axios.defaults.withCredentials = true;

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
      toast.error("Failed to connect to LinkedIn");
      console.error("Failed to get auth URL", err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="glass-card w-full max-w-md p-10 relative z-10 animate-fade-in flex flex-col items-center text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/[0.08]">
        
        <img src="/logo.png" alt="ClickedIn AI" className="w-56 h-auto mb-4 drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]" />
        
        <p className="text-sm text-slate-400 mb-8 font-medium tracking-wide">Automate your professional growth. Safely.</p>

        <div className="w-full space-y-4">
          <button 
            onClick={handleLinkedInLogin}
            className="w-full flex items-center justify-center space-x-3 bg-[#0A66C2] hover:bg-[#004182] text-white py-4 rounded-2xl font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(10,102,194,0.4)] hover:shadow-[0_0_25px_rgba(10,102,194,0.6)] hover:-translate-y-1"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            <span>Continue with LinkedIn</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const ClickedInDashboard = ({ userProfile, onLogout }) => {
  const [activeTab, setActiveTab] = useState('generate'); // 'generate', 'schedule', 'profile'
  const [showSettings, setShowSettings] = useState(false);
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState(localStorage.getItem('userWorkHistory') || '');
  const [size, setSize] = useState('Medium');
  const [tone, setTone] = useState('Professional');
  const [postCount, setPostCount] = useState(1);
  const [hoursGap, setHoursGap] = useState(4);
  const [minutesGap, setMinutesGap] = useState(0);
  const [fullyAutomated, setFullyAutomated] = useState(false);
  const [automatedPostCount, setAutomatedPostCount] = useState(1);
  const [automatedStartTime, setAutomatedStartTime] = useState("10:00");
  const [automatedEndTime, setAutomatedEndTime] = useState("21:00");
  
  // Connections tab state
  const [trialStatus, setTrialStatus] = useState({ isActive: false, daysLeft: 0, started: false });
  const [connTargets, setConnTargets] = useState('');
  const [connMessage, setConnMessage] = useState('');
  const [connQueue, setConnQueue] = useState([]);
  
  const [queue, setQueue] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchQueue();
    // Poll queue every 30 seconds to automatically remove posted items
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchConnectionsTrial();
    fetchConnectionsQueue();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/user/settings');
      if (res.data) {
        if (res.data.context) setContext(res.data.context);
        if (res.data.fullyAutomated !== undefined) setFullyAutomated(res.data.fullyAutomated);
        if (res.data.automatedPostCount !== undefined) setAutomatedPostCount(res.data.automatedPostCount);
        if (res.data.automatedStartTime) setAutomatedStartTime(res.data.automatedStartTime);
        if (res.data.automatedEndTime) setAutomatedEndTime(res.data.automatedEndTime);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        window.location.reload();
      }
      console.error("Error fetching settings", err);
    }
  };

  const fetchConnectionsTrial = async () => {
    try {
      const res = await axios.get('/api/connections/trial');
      setTrialStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConnectionsQueue = async () => {
    try {
      const res = await axios.get('/api/connections/queue');
      setConnQueue(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    localStorage.setItem('userWorkHistory', context);
  }, [context]);

  const fetchQueue = async () => {
    try {
      const res = await axios.get('/api/posts');
      const now = new Date();
      // Keep posts that are in the queue until the backend naturally removes them upon publishing
      const activePosts = res.data.filter(p => {
        if (p.status === 'published' || p.status === 'posted') return false;
        return true;
      });
      setQueue(activePosts);
    } catch (err) {
      console.error("Error fetching queue", err);
    }
  };

  const handleSaveProfile = async () => {
    localStorage.setItem('userWorkHistory', context);
    try {
      await axios.post('/api/user/settings', { context, fullyAutomated, automatedPostCount, automatedStartTime, automatedEndTime });
      toast.success("Profile experience & settings saved successfully!");
    } catch (err) {
      if (err.response?.status === 401) {
        window.location.reload();
        return;
      }
      toast.error("Failed to save settings to server.");
    }
  };

  const handleRunAutomation = async () => {
    const toastId = toast.loading("Generating today's automated posts...");
    try {
      // Save latest settings first
      await axios.post('/api/user/settings', { context, fullyAutomated, automatedPostCount, automatedStartTime, automatedEndTime });
      
      await axios.post('/api/user/automation/run');
      toast.success("Automated posts generated and scheduled successfully!", { id: toastId });
      setActiveTab('schedule');
      fetchQueue();
    } catch (err) {
      if (err.response?.status === 401) {
        window.location.reload();
        return;
      }
      toast.error("Failed to run automation.", { id: toastId });
    }
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!topic) {
      toast.error("Please enter a topic first!");
      return;
    }
    setIsGenerating(true);
    const toastId = toast.loading("AI is crafting your posts...");
    try {
      await axios.post('/api/posts', {
        topic,
        context,
        size,
        tone,
        count: postCount,
        baseTime: new Date().toISOString(),
        hoursGap,
        minutesGap
      });
      toast.success(`${postCount} post(s) generated successfully!`, { id: toastId });
      setActiveTab('schedule');
      fetchQueue();
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Error connecting to AI generation service.";
      toast.error(errorMsg, { id: toastId });
    }
    setIsGenerating(false);
  };

  const handleStartTrial = async () => {
    try {
      const res = await axios.post('/api/connections/trial/start');
      setTrialStatus(res.data);
      toast.success("7-Day Premium Trial Started!");
    } catch (err) {
      toast.error("Could not start trial.");
    }
  };

  const handleQueueConnections = async () => {
    if (!connTargets) {
      toast.error("Please enter at least one target role/company.");
      return;
    }
    const targets = connTargets.split(',').map(t => t.trim()).filter(t => t);
    if (targets.length === 0) return;
    
    try {
      const res = await axios.post('/api/connections/queue', { targets, message: connMessage });
      if (res.data.success) {
        toast.success(`Queued ${res.data.queued} connection requests!`);
        setConnTargets('');
        setConnMessage('');
        fetchConnectionsQueue();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to queue connections.");
    }
  };

  const handleApprove = async (id, currentContent, scheduledTime) => {
    try {
      await axios.put(`/api/posts/${id}/approve`, { content: currentContent, scheduledTime });
      toast.success("Post successfully scheduled!");
      fetchQueue();
    } catch (err) {
      toast.error("Failed to schedule post");
    }
  };

  const handleApproveAll = async () => {
    const drafts = queue.filter(p => p.status === 'draft');
    if (drafts.length === 0) {
      toast.error("No pending drafts to approve!");
      return;
    }
    
    const batchInputEl = document.getElementById('batch-time');
    let startTimeStr = batchInputEl ? batchInputEl.value : null;
    
    if (!startTimeStr) {
      toast.error("Please set a master start time for the batch!");
      return;
    }
    
    const baseTimeObj = new Date(startTimeStr);
    
    try {
      await Promise.all(drafts.map((post, index) => {
        const scheduledTimeObj = new Date(baseTimeObj.getTime() + (index * ((hoursGap * 60) + minutesGap) * 60 * 1000));
        return axios.put(`/api/posts/${post.id}/approve`, {
          content: document.getElementById(`content-${post.id}`).value,
          scheduledTime: scheduledTimeObj.toISOString()
        });
      }));
      toast.success(`Successfully scheduled ${drafts.length} post(s)!`);
      fetchQueue();
    } catch (err) {
      toast.error("Failed to approve batch");
      console.error(err);
    }
  };

  const discardDraft = async (id) => {
    setQueue(prev => prev.filter(p => p.id !== id));
    toast.success("Post deleted successfully");
    try {
      await axios.delete(`/api/posts/${id}`);
    } catch (err) {
      console.error("Delete error", err);
      fetchQueue();
    }
  };

  const cancelSchedule = async (id) => {
    try {
      await axios.put(`/api/posts/${id}/cancel`);
      toast.success("Schedule cancelled");
      fetchQueue();
    } catch (err) {
      toast.error("Failed to cancel schedule");
    }
  };

  const draftCount = queue.filter(p => p.status === 'draft').length;

  const renderPostsQueueList = () => (
    <div className="p-8 flex-1 flex flex-col">
      {queue.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
          <div className="relative w-28 h-28 mb-6">
             <div className="absolute inset-0 border-2 border-dashed border-slate-700 rounded-full animate-[spin_10s_linear_infinite]"></div>
             <div className="absolute inset-2 border-2 border-dashed border-cyan-500/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
             <div className="absolute inset-0 flex items-center justify-center">
               <FileText size={36} className="text-cyan-400 opacity-60" />
             </div>
          </div>
          <h3 className="text-white font-bold text-xl tracking-wide mb-2">Queue is Empty</h3>
          <p className="text-slate-400 text-sm mb-4">No active drafts or scheduled posts right now.</p>
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
                
                <div className="flex justify-end items-center space-x-3">
                  {post.status === 'draft' && (
                    <>
                      <input 
                        type="datetime-local" 
                        id={`time-${post.id}`} 
                        defaultValue={post.scheduledTime ? new Date(new Date(post.scheduledTime).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : new Date(Date.now() + 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        style={{ colorScheme: 'dark' }}
                        className="glass-input rounded-lg px-3 py-2 text-[13px] text-white cursor-pointer"
                      />
                      <button 
                        onClick={() => {
                          const inputEl = document.getElementById(`time-${post.id}`);
                          const timeVal = inputEl ? inputEl.value : null;
                          
                          if (!timeVal) {
                            toast.error("Please select a date and time before scheduling!");
                            return;
                          }
                          handleApprove(post.id, document.getElementById(`content-${post.id}`).value, timeVal);
                        }}
                        className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg hover:shadow-white/10 border border-white/10"
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
                  <button 
                    onClick={() => discardDraft(post.id)}
                    className="flex items-center space-x-1.5 text-sm font-semibold text-red-400 hover:text-red-300 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10 border border-red-500/20"
                    title="Delete post"
                  >
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 lg:p-12 flex justify-center overflow-x-hidden relative">
      
      {/* Background glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1200px] w-full relative z-10 animate-fade-in">
        
        {/* Header */}
        <header className="relative z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => setActiveTab('generate')}>
            <img src="/logo.png" alt="ClickedIn AI" className="h-16 w-auto object-contain drop-shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-transform duration-300 group-hover:scale-105" />
          </div>

          <div className="flex items-center bg-white/[0.02] p-1.5 rounded-full border border-white/10 backdrop-blur-xl shadow-lg hover:bg-white/[0.04] transition-colors duration-300">
             <div className="flex items-center pl-4 pr-3 py-1 border-r border-white/10 cursor-pointer" onClick={() => setActiveTab('profile')}>
               <div className="relative flex h-2 w-2 mr-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </div>
               <span className="text-[13px] font-semibold text-slate-200 tracking-wide">{userProfile?.name}</span>
             </div>
             
             <div className="relative">
               <button 
                 onClick={() => setShowSettings(!showSettings)}
                 className="flex items-center px-2 space-x-3 text-slate-400 hover:text-cyan-400 transition-colors h-full"
               >
                 <Settings size={16} className={showSettings ? "text-cyan-400 rotate-90 transition-all" : "transition-all"} />
                 <div className="relative group cursor-pointer">
                   {userProfile?.pictureUrl ? (
                     <img src={userProfile.pictureUrl} alt="Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-white/10 group-hover:border-cyan-500/50 transition-colors" />
                   ) : (
                     <div className="w-9 h-9 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-bold flex items-center justify-center border-2 border-white/10 group-hover:border-cyan-500/50 transition-colors uppercase">
                       {userProfile?.name ? userProfile.name.charAt(0) : '?'}
                     </div>
                   )}
                 </div>
               </button>
               
               {showSettings && (
                 <div className="absolute top-full mt-4 right-0 w-64 bg-[#0F1115] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden backdrop-blur-xl animate-fade-in flex flex-col">
                    <button 
                      onClick={() => {
                        setShowSettings(false);
                        setActiveTab('profile');
                      }}
                      className="w-full text-left px-5 py-4 text-[14px] text-white hover:bg-white/5 font-bold transition-colors border-b border-white/5 flex items-center space-x-3"
                    >
                       <User size={16} className="text-cyan-400" />
                       <span>Profile & Work Experience</span>
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
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-3 mb-8 bg-white/[0.02] p-2 rounded-2xl border border-white/[0.08] backdrop-blur-xl max-w-5xl mx-auto">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'generate'
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={18} className={activeTab === 'generate' ? 'text-cyan-400' : ''} />
            <span>Generate Content</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-300 relative ${
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock size={18} className={activeTab === 'schedule' ? 'text-purple-400' : ''} />
            <span>Timing & Batch Schedule</span>
            {queue.length > 0 && (
              <span className="ml-2 bg-purple-500/30 text-purple-300 border border-purple-500/50 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {queue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User size={18} className={activeTab === 'profile' ? 'text-emerald-400' : ''} />
            <span>Profile & Experience</span>
          </button>

          <button
            onClick={() => setActiveTab('automated')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'automated'
                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/40 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles size={18} className={activeTab === 'automated' ? 'text-blue-400' : ''} />
            <span>Automated Posts</span>
          </button>

          <button
            onClick={() => setActiveTab('connections')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3.5 px-5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'connections'
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={18} className={activeTab === 'connections' ? 'text-amber-400' : ''} />
            <span>Connections (Premium)</span>
          </button>
        </div>

        <div className="max-w-5xl mx-auto w-full space-y-8">
          
          {/* TAB 1: GENERATE CONTENT */}
          {activeTab === 'generate' && (
            <div className="glass-card z-20 animate-fade-in">
              <div className="bg-white/[0.03] border-b border-white/[0.05] px-8 py-5 flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Sparkles size={20} className="text-cyan-400" />
                  </div>
                  <h2 className="font-bold tracking-widest text-[13px] text-white uppercase">Generate Content Queue</h2>
                </div>
                <div className="text-xs text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                  AI Generator Active
                </div>
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
                    <span><strong className="text-slate-300">Tip:</strong> You can add your experience under the <strong>Profile & Experience</strong> tab for personalized AI output!</span>
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
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic}
                  className="w-full mt-4 flex items-center justify-center space-x-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 hover:from-cyan-400 hover:via-blue-400 hover:to-blue-500 text-white py-4 rounded-2xl font-bold tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] transition-all duration-500 hover:-translate-y-1 hover:scale-[1.01] disabled:opacity-50 disabled:pointer-events-none disabled:transform-none uppercase relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none skew-x-12"></div>
                  {isGenerating ? (
                    <span className="animate-pulse flex items-center space-x-2 relative z-10">
                      <Sparkles size={20} className="animate-spin" />
                      <span>Synthesizing Draft...</span>
                    </span>
                  ) : (
                    <div className="flex items-center space-x-2 relative z-10">
                      <Sparkles size={20} />
                      <span>Generate Content Queue</span>
                    </div>
                  )}
                </button>
                
              </div>
            </div>
          )}

          {/* TAB 2: TIMING SLOT & SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="glass-card min-h-[500px] flex flex-col animate-fade-in">
              <div className="bg-white/[0.03] border-b border-white/[0.05] px-8 py-5 flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock size={20} className="text-purple-400" />
                  </div>
                  <h2 className="font-bold tracking-widest text-[13px] text-white uppercase">Timing Slots & Batch Scheduler</h2>
                </div>
                <div className="bg-white/10 border border-white/10 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  {queue.length} {queue.length === 1 ? 'Post' : 'Posts'} Total
                </div>
              </div>
              
              {/* Batch Schedule Settings Box */}
              <div className="px-8 pt-6 pb-4 border-b border-white/[0.05]">
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col xl:flex-row items-center justify-between shadow-lg">
                  <div className="mb-4 xl:mb-0 xl:mr-6 flex-1">
                    <h3 className="text-white font-bold text-[15px] tracking-wide mb-1 flex items-center">
                      <Layers size={18} className="mr-2 text-purple-400" /> 
                      Batch Timing Slots
                    </h3>
                    <p className="text-slate-400 text-[13px]">Define your master start time and gap duration. Applying "Approve All" will schedule all pending drafts across your timing slots.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-end space-y-4 sm:space-y-0 sm:space-x-4">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1 ml-1 uppercase font-bold tracking-wider">Start Time</label>
                      <input 
                        type="datetime-local" 
                        id="batch-time"
                        defaultValue={new Date(Date.now() + 3600000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        style={{ colorScheme: 'dark' }}
                        className="glass-input rounded-xl px-4 py-2.5 text-[14px] text-white cursor-pointer w-full sm:w-auto border-white/10"
                      />
                    </div>
                    
                    <div className="flex space-x-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1 uppercase font-bold tracking-wider">Hours Gap</label>
                        <input 
                          type="number" min="0" max="72"
                          className="w-20 glass-input rounded-xl px-3 py-2.5 text-[14px] text-white text-center border-white/10"
                          value={hoursGap.toString()}
                          onChange={(e) => setHoursGap(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1 ml-1 uppercase font-bold tracking-wider">Mins Gap</label>
                        <input 
                          type="number" min="0" max="59"
                          className="w-20 glass-input rounded-xl px-3 py-2.5 text-[14px] text-white text-center border-white/10"
                          value={minutesGap.toString()}
                          onChange={(e) => setMinutesGap(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleApproveAll}
                      disabled={draftCount === 0}
                      className="w-full sm:w-auto h-[44px] flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-sm font-bold px-6 rounded-xl transition-all shadow-[0_4px_15px_rgba(168,85,247,0.3)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.5)] border border-purple-400/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Send size={16} />
                      <span>Approve All Drafts ({draftCount})</span>
                    </button>
                  </div>
                </div>
              </div>

              {renderPostsQueueList()}
            </div>
          )}

          {/* TAB 3: PROFILE & EXPERIENCE */}
          {activeTab === 'profile' && (
            <div className="glass-card z-20 animate-fade-in p-8 space-y-8">
              <div className="bg-white/[0.03] border-b border-white/[0.05] -mx-8 -mt-8 px-8 py-5 flex items-center justify-between rounded-t-3xl mb-8">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <User size={20} className="text-emerald-400" />
                  </div>
                  <h2 className="font-bold tracking-widest text-[13px] text-white uppercase">Profile & Work Experience</h2>
                </div>
                <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 flex items-center space-x-1.5">
                  <ShieldCheck size={14} />
                  <span>LinkedIn Connected</span>
                </div>
              </div>

              {/* Profile Card Summary */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 shadow-lg">
                {userProfile?.pictureUrl ? (
                  <img src={userProfile.pictureUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 text-2xl font-bold flex items-center justify-center border-4 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase">
                    {userProfile?.name ? userProfile.name.charAt(0) : '?'}
                  </div>
                )}
                <div className="text-center sm:text-left flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1">{userProfile?.name || 'LinkedIn User'}</h3>
                  <p className="text-slate-400 text-sm flex items-center justify-center sm:justify-start">
                    <CheckCircle size={14} className="text-emerald-400 mr-1.5" /> Connected to LinkedIn Automation Engine
                  </p>
                </div>
                <button 
                  onClick={onLogout}
                  className="flex items-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2.5 rounded-xl font-bold text-xs transition-all"
                >
                  <LogOut size={14} />
                  <span>Disconnect</span>
                </button>
              </div>

              {/* Work History / Experience */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-[12px] font-bold text-slate-300 uppercase tracking-widest">
                    Global AI Context (Work Experience & Bio)
                  </label>
                  <span className="text-xs text-emerald-400 font-semibold">Permanently saved for AI content generation</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  LinkedIn's API privacy policies prevent third-party tools from automatically importing work history. Paste your resume, achievements, or career bio here once—the AI engine will reference this to generate authentic, personalized posts that match your background.
                </p>
                <textarea 
                  placeholder="Paste your work experience, resume bullet points, key achievements, or professional summary here..." 
                  className="w-full p-5 glass-input text-[15px] text-white placeholder-slate-600 min-h-[220px] resize-y leading-relaxed"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                />
              </div>


              {/* Action Button */}
              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleSaveProfile}
                  className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold px-8 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:scale-105"
                >
                  <Save size={18} />
                  <span>Save Experience & Settings</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: AUTOMATED POSTS */}
          {activeTab === 'automated' && (
            <div className="glass-card z-20 animate-fade-in p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center">
                    <Sparkles className="mr-3 text-cyan-500" />
                    Fully Automated Daily Posting
                  </h2>
                  <p className="text-slate-400 mt-2">Set up AI to automatically generate and schedule relevant posts daily.</p>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 shadow-lg flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-white flex items-center space-x-2">
                      <Sparkles size={16} className="text-cyan-400" />
                      <span>Enable Automation</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Turn this on to let AI handle your daily posting based on your work experience.
                    </p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={fullyAutomated}
                      onChange={(e) => {
                        if (e.target.checked && (!context || context.trim() === '')) {
                          toast.error("You must fill out your Work Experience in the Profile tab first!");
                          return;
                        }
                        setFullyAutomated(e.target.checked);
                      }}
                    />
                    <div className="w-14 h-7 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 shadow-inner"></div>
                  </label>
                </div>
                
                {fullyAutomated && (
                  <div className="flex flex-col space-y-4 border-t border-white/10 pt-4 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[14px] font-bold text-slate-300">
                        Posts Per Day
                      </div>
                      <div className="flex items-center space-x-3 bg-black/20 p-1.5 rounded-xl border border-white/5">
                        <button 
                          onClick={() => setAutomatedPostCount(Math.max(1, automatedPostCount - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white font-bold transition-all"
                        >-</button>
                        <span className="w-6 text-center text-white font-black">{automatedPostCount}</span>
                        <button 
                          onClick={() => setAutomatedPostCount(Math.min(5, automatedPostCount + 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white font-bold transition-all"
                        >+</button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-[14px] font-bold text-slate-300">
                        Posting Time Window
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="time" 
                          value={automatedStartTime} 
                          onChange={e => setAutomatedStartTime(e.target.value)} 
                          className="glass-input rounded-lg px-2 py-1 text-[13px] text-white w-[100px]"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-slate-500 font-bold">to</span>
                        <input 
                          type="time" 
                          value={automatedEndTime} 
                          onChange={e => setAutomatedEndTime(e.target.value)} 
                          className="glass-input rounded-lg px-2 py-1 text-[13px] text-white w-[100px]"
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end space-x-4">
                {fullyAutomated && (
                  <button 
                    onClick={handleRunAutomation}
                    className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-2xl transition-all hover:scale-105 border border-white/10"
                  >
                    <Sparkles size={18} className="text-cyan-400" />
                    <span>Generate Today's Posts Now</span>
                  </button>
                )}
                <button 
                  onClick={handleSaveProfile}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold px-8 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-105"
                >
                  <Save size={18} />
                  <span>Save Automation Settings</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 5: CONNECTIONS */}
          {activeTab === 'connections' && (
            <div className="glass-card z-20 animate-fade-in p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 flex items-center">
                    <Users className="mr-3 text-amber-500" />
                    Automated Connections (Premium)
                  </h2>
                  <p className="text-slate-400 mt-2">Target profiles and auto-connect with personalized messages.</p>
                </div>
                {!trialStatus.isActive && !trialStatus.started && (
                  <button onClick={handleStartTrial} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg hover:scale-105 transition-all">
                    Start 7-Day Free Trial
                  </button>
                )}
                {trialStatus.isActive && (
                  <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl text-amber-400 font-bold flex items-center">
                    <Clock size={16} className="mr-2" />
                    Trial Active: {trialStatus.daysLeft} days left
                  </div>
                )}
                {!trialStatus.isActive && trialStatus.started && (
                  <div className="bg-red-500/10 border border-red-500/30 px-4 py-2 rounded-xl text-red-400 font-bold flex items-center">
                    <ShieldAlert size={16} className="mr-2" />
                    Trial Expired
                  </div>
                )}
              </div>

              {trialStatus.isActive && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Target Roles / Companies (comma separated)</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Founders, Marketing Managers, Microsoft" 
                        className="w-full p-4 glass-input text-white placeholder-slate-500"
                        value={connTargets}
                        onChange={(e) => setConnTargets(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-300 mb-2">Intro Message (Optional)</label>
                      <textarea 
                        placeholder="Hi! I'd love to connect and follow your work..." 
                        className="w-full p-4 glass-input text-white placeholder-slate-500 min-h-[120px]"
                        value={connMessage}
                        onChange={(e) => setConnMessage(e.target.value)}
                      />
                    </div>
                    <button 
                      onClick={handleQueueConnections}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center"
                    >
                      <Play size={18} className="mr-2" /> Start Automation Queue
                    </button>
                  </div>

                  <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <Clock size={18} className="text-amber-400 mr-2" />
                      Active Queue ({connQueue.filter(c => c.status === 'queued').length})
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {connQueue.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">Queue is empty.</p>
                      ) : (
                        connQueue.map(c => (
                          <div key={c.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between">
                            <div>
                              <p className="text-white font-semibold">{c.target}</p>
                              <p className="text-xs text-slate-400 truncate w-[200px]">{c.message || "No message"}</p>
                            </div>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                              c.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {c.status.toUpperCase()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!trialStatus.isActive && !trialStatus.started && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-10 text-center">
                  <Star size={48} className="mx-auto text-amber-500 mb-4" />
                  <h3 className="text-2xl font-black text-white mb-2">Unlock Growth with Automated Connections</h3>
                  <p className="text-slate-400 max-w-lg mx-auto mb-6">Set up your target audience, customize your connection message, and let AI expand your network 24/7 without lifting a finger.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const justConnected = urlParams.get('success') === 'linkedin_connected';
    if (justConnected) {
      trackActivity('login', { label: 'linkedin_connected' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const res = await axios.get('/api/auth/status', { withCredentials: true });
      if (res.data.connected) {
        setIsAuthenticated(true);
        setUserProfile(res.data.profile);
      } else {
        setIsAuthenticated(false);
        setUserProfile(null);
      }
    } catch (err) {
      console.error("Auth status error", err);
      setIsAuthenticated(false);
      setUserProfile(null);
    } finally {
      setAuthReady(true);
    }
  };

  const handleLogin = (profile) => {
    setIsAuthenticated(true);
    setUserProfile(profile);
    trackActivity('login', {
      userId: profile?.id,
      userName: profile?.name,
      label: 'client_login',
    });
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      trackActivity('logout', {
        userId: userProfile?.id,
        userName: userProfile?.name,
      });
      setIsAuthenticated(false);
      setUserProfile(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  if (isAdminRoute) {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
        <ActivityTracker userProfile={userProfile} />
        <AdminPanel />
      </>
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080A] text-slate-400 text-sm">
        Restoring your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
        <ActivityTracker userProfile={null} />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <ActivityTracker userProfile={userProfile} />
      <ClickedInDashboard userProfile={userProfile} onLogout={handleLogout} />
    </>
  );
}
