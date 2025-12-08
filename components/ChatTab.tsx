
import React, { useState, useEffect } from 'react';
import { User, ChatThread, ChatMessage, JobRequest, Job } from '../types';
import { getChats, saveChat, getJobs, getRequests, acceptProposal, setJobCompleted } from '../services/storage';
import { ChevronLeft, Send, CheckCircle, MessageCircle, Briefcase, Info, Clock, AlertCircle, Wallet, ShieldCheck } from 'lucide-react';

interface ChatTabProps {
  currentUser: User;
  initialChatProName?: string | null;
  initialChatProAvatar?: string | null;
  initialRequestId?: string | null;
  onCloseDetail: () => void;
  onOpenProfile: (name: string) => void; 
}

export const ChatTab: React.FC<ChatTabProps> = ({ 
  currentUser, 
  initialChatProName, 
  initialChatProAvatar, 
  initialRequestId,
  onCloseDetail,
  onOpenProfile
}) => {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [inputText, setInputText] = useState('');
  
  // Job State
  const [activeRequest, setActiveRequest] = useState<JobRequest | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  
  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState('');

  useEffect(() => {
    const initChats = async () => {
        let loadedThreads = await getChats();

        if (initialChatProName) {
            const existing = loadedThreads.find(t => 
                (currentUser.role === 'cliente' && t.professionalName === initialChatProName) || 
                (currentUser.role === 'professionista' && t.clientName === initialChatProName)
            );

            if (existing) {
                setActiveThreadId(existing.id);
            } else {
                const newThread: ChatThread = {
                    id: Date.now().toString(),
                    professionalName: currentUser.role === 'cliente' ? initialChatProName : currentUser.name,
                    clientName: currentUser.role === 'cliente' ? currentUser.name : initialChatProName,
                    avatar: initialChatProAvatar || '',
                    lastMessage: '',
                    time: 'Adesso',
                    messages: [],
                    relatedRequestId: initialRequestId || undefined
                };
                loadedThreads = [newThread, ...loadedThreads];
                await saveChat(newThread);
                setActiveThreadId(newThread.id);
            }
        }
        
        const myThreads = loadedThreads.filter(t => {
            if (currentUser.role === 'cliente') return t.clientName === currentUser.name || !t.clientName;
            return t.professionalName === currentUser.name;
        });

        setThreads(myThreads);
    };

    initChats();
  }, [initialChatProName, initialChatProAvatar, currentUser]);

  useEffect(() => {
    if (activeThreadId) {
        const thread = threads.find(t => t.id === activeThreadId);
        if (thread) {
            checkJobStatus(thread);
        }
    }
  }, [activeThreadId, threads]);

  const checkJobStatus = async (thread: ChatThread) => {
      if (thread.relatedRequestId) {
          const reqs = await getRequests();
          const req = reqs.find(r => r.id === thread.relatedRequestId);
          if (req) {
              setActiveRequest(req);
              // Default price suggestion based on budget
              if(!agreedPrice) setAgreedPrice(req.budget.replace(/[^0-9]/g, '') || '100');
          }
      } else {
          setActiveRequest(null);
      }

      const jobs = await getJobs();
      const job = jobs.find(j => 
        j.clientName === (thread.clientName || currentUser.name) && 
        j.professionalName === thread.professionalName &&
        j.status !== 'completed'
      );
      
      const completedJob = jobs.find(j => 
        j.clientName === (thread.clientName || currentUser.name) && 
        j.professionalName === thread.professionalName && 
        j.status === 'completed'
      );

      setActiveJob(job || completedJob || null);
  }

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeThreadId) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      fromMe: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedThreads = threads.map(t => {
      if (t.id === activeThreadId) {
        const updated = {
          ...t,
          lastMessage: inputText,
          time: newMessage.timestamp,
          messages: [...t.messages, newMessage]
        };
        saveChat(updated); // This is async but we can fire and forget here or await if strictly needed
        return updated;
      }
      return t;
    });

    setThreads(updatedThreads);
    setInputText('');
  };

  const handleAcceptAndPay = async () => {
      if (!activeThreadId || !activeRequest) return;
      const thread = threads.find(t => t.id === activeThreadId);
      if (!thread) return;

      const price = parseFloat(agreedPrice);
      if(isNaN(price) || price <= 0) {
          alert("Inserisci un prezzo valido");
          return;
      }

      const proName = thread.professionalName;
      const newJob = await acceptProposal(activeRequest.id, proName, currentUser.name, price);
      
      if (newJob) {
          const sysMsg: ChatMessage = {
              id: Date.now().toString(),
              text: `💶 PAGAMENTO INVIATO. ${price}€ sono stati bloccati in Escrow. Il lavoro è in corso.`,
              fromMe: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isSystem: true
          };
          updateThreadWithSysMsg(sysMsg);
          setActiveJob(newJob);
          setShowPaymentModal(false);
      }
  };

  const handleMarkCompleted = async () => {
      if (!activeJob) return;

      const result = await setJobCompleted(activeJob.id, currentUser.role);
      if (!result) return;

      const { job, isFullyCompleted } = result;
      setActiveJob(job);

      let msgText = '';
      if (isFullyCompleted) {
          msgText = `🏁 LAVORO COMPLETATO! Il pagamento di ${activeJob.price}€ (meno commissioni) è stato rilasciato al professionista.`;
      } else {
          msgText = `⏳ ${currentUser.name} ha confermato. In attesa dell'altra parte per sbloccare i fondi.`;
      }
      
      const sysMsg: ChatMessage = {
        id: Date.now().toString(),
        text: msgText,
        fromMe: true,
        timestamp: new Date().toLocaleTimeString(),
        isSystem: true
      };
      updateThreadWithSysMsg(sysMsg);
  };

  const updateThreadWithSysMsg = (sysMsg: ChatMessage) => {
    const updatedThreads = threads.map(t => {
        if (t.id === activeThreadId) {
          const updated = { ...t, messages: [...t.messages, sysMsg] };
          saveChat(updated);
          return updated;
        }
        return t;
      });
      setThreads(updatedThreads);
  }

  const activeThread = threads.find(t => t.id === activeThreadId);
  
  const showAcceptButton = 
    currentUser.role === 'cliente' && 
    activeRequest && 
    activeRequest.status === 'open' &&
    activeRequest.candidates.includes(activeThread?.professionalName || '');

  const showCompleteButton = activeJob && 
    activeJob.status === 'in_progress' && 
    ((currentUser.role === 'cliente' && !activeJob.clientCompleted) || 
     (currentUser.role === 'professionista' && !activeJob.proCompleted));

  const isWaitingForOther = activeJob && activeJob.status === 'in_progress' &&
    ((currentUser.role === 'cliente' && activeJob.clientCompleted) || 
     (currentUser.role === 'professionista' && activeJob.proCompleted));

  const displayName = activeThread ? (currentUser.role === 'cliente' ? activeThread.professionalName : activeThread.clientName) : '';

  // --- List View ---
  if (!activeThreadId) {
    return (
      <div className="bg-white min-h-full pb-20">
        <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h1 className="text-2xl font-bold text-gray-900">Messaggi</h1>
        </div>
        <div className="divide-y divide-gray-50">
          {threads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Nessuna chat attiva.</p>
            </div>
          ) : (
            threads.map(thread => {
                const name = currentUser.role === 'cliente' ? thread.professionalName : thread.clientName;
                return (
                    <div 
                        key={thread.id} 
                        onClick={() => setActiveThreadId(thread.id)}
                        className="p-4 flex items-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                    >
                        <img src={thread.avatar} alt={name} className="w-12 h-12 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{name}</h3>
                            <span className="text-xs text-gray-400">{thread.time}</span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{thread.lastMessage || 'Inizia una conversazione'}</p>
                        </div>
                    </div>
                );
            })
          )}
        </div>
      </div>
    );
  }

  // --- Detail View ---
  return (
    <div className="bg-gray-50 h-[100dvh] flex flex-col fixed inset-0 z-20 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white px-4 py-3 shadow-sm flex items-center gap-3">
        <button 
            onClick={() => {
                setActiveThreadId(null);
                onCloseDetail();
            }} 
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        
        <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => {
                if(displayName) {
                    onCloseDetail();
                    onOpenProfile(displayName);
                }
            }}
        >
            <img src={activeThread?.avatar} className="w-9 h-9 rounded-full border border-gray-100" />
            <div className="flex flex-col">
                <span className="font-semibold text-gray-900 text-sm leading-tight flex items-center gap-1">
                    {displayName}
                    <Info className="w-3 h-3 text-gray-400" />
                </span>
                <span className="text-xs text-gray-500">{currentUser.role === 'cliente' ? 'Professionista' : 'Cliente'}</span>
            </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        
        {/* PAYMENT MODAL */}
        {showPaymentModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-fade-in-up">
                    <h3 className="text-lg font-bold mb-2">Conferma Pagamento</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        I soldi verranno bloccati in <b>Escrow</b> e rilasciati al professionista solo a lavoro concluso.
                    </p>
                    
                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-500">Prezzo Concordato (€)</label>
                        <input 
                            type="number" 
                            value={agreedPrice} 
                            onChange={e => setAgreedPrice(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-lg font-bold"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 text-gray-600 font-bold bg-gray-100 rounded-lg">Annulla</button>
                        <button onClick={handleAcceptAndPay} className="flex-1 py-2 text-white font-bold bg-green-600 rounded-lg hover:bg-green-700">Paga e Blocca</button>
                    </div>
                </div>
            </div>
        )}

        {/* 1. Proposal Acceptance (Client Only) */}
        {showAcceptButton && (
            <div className="bg-white border border-blue-200 p-4 rounded-xl shadow-sm mb-4">
                <h4 className="font-bold text-gray-900 mb-1 text-sm">{activeRequest?.title}</h4>
                <p className="text-xs text-gray-500 mb-3">Questo professionista si è candidato. Accetta per bloccare il prezzo e iniziare.</p>
                <button 
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full bg-blue-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Wallet className="w-4 h-4" />
                    Accetta e Paga
                </button>
            </div>
        )}

        {/* 2. Job Status */}
        {activeJob && activeJob.status === 'in_progress' && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4 text-center">
                <span className="text-xs font-bold text-green-800 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Fondi in Escrow: {activeJob.price}€
                </span>
                {isWaitingForOther && (
                     <p className="text-xs text-orange-600 mt-1 flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3" /> In attesa di conferma finale.
                     </p>
                )}
            </div>
        )}

        {/* 3. Job Completion Action */}
        {showCompleteButton && (
            <div className="bg-white border border-gray-100 p-4 rounded-lg mb-4 text-center shadow-sm">
                <p className="text-xs text-gray-500 mb-2">
                    Lavoro finito? Conferma per {currentUser.role === 'cliente' ? 'rilasciare il pagamento' : 'ricevere il pagamento'}.
                </p>
                <button 
                    onClick={handleMarkCompleted}
                    className="w-full py-2 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                >
                    <CheckCircle className="w-4 h-4" />
                    Conferma e Sblocca Fondi
                </button>
            </div>
        )}

        {activeJob && activeJob.status === 'completed' && (
             <div className="bg-gray-100 p-3 rounded-lg mb-4 text-center border border-gray-200">
                <p className="text-xs font-bold text-gray-600 flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Transazione conclusa il {new Date(activeJob.completedAt || '').toLocaleDateString()}
                </p>
             </div>
        )}

        {activeThread?.messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.isSystem ? 'justify-center' : (msg.fromMe ? 'justify-end' : 'justify-start')}`}>
            {msg.isSystem ? (
                <div className="bg-yellow-50 border border-yellow-100 px-3 py-1.5 rounded-lg max-w-[90%] text-center my-2 shadow-sm">
                    <span className="text-[10px] text-gray-700 font-bold block">{msg.text}</span>
                </div>
            ) : (
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                msg.fromMe 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                }`}>
                {msg.text}
                <div className={`text-[10px] mt-1 text-right ${msg.fromMe ? 'text-blue-200' : 'text-gray-400'}`}> 
                    {msg.timestamp}
                </div>
                </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white p-3 border-t border-gray-100 flex gap-2 pb-6 safe-area-bottom">
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Scrivi un messaggio..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
            onClick={handleSendMessage}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
