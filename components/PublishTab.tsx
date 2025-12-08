
import React, { useState, useEffect } from 'react';
import { User, JobRequest } from '../types';
import { saveRequest, getRequests, isCloudConnected } from '../services/storage';
import { PlusCircle, Image as ImageIcon, Briefcase, MapPin, List, RefreshCw, AlertTriangle, CheckCircle, XCircle, WifiOff } from 'lucide-react';

interface PublishTabProps {
  currentUser: User;
  onSuccess: () => void; 
}

type Mode = 'new' | 'dashboard';

export const PublishTab: React.FC<PublishTabProps> = ({ currentUser, onSuccess }) => {
  const [mode, setMode] = useState<Mode>('new');
  
  // New Request Form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [category, setCategory] = useState('Idraulico');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(true);

  // Dashboard Data
  const [myRequests, setMyRequests] = useState<JobRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isClient = currentUser.role === 'cliente';

  useEffect(() => {
    setCloudStatus(isCloudConnected());
    if (isClient) {
        loadMyRequests();
    }
  }, [currentUser, mode]);

  const loadMyRequests = async () => {
      setIsLoading(true);
      try {
        const reqs = await getRequests();
        setMyRequests(reqs.filter(r => r.clientId === currentUser.email || r.clientName === currentUser.name));
      } catch (e) {
        console.error("Failed to load requests", e);
      } finally {
        setIsLoading(false);
      }
  }

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClient) return;
    if (!cloudStatus) {
        setToast({msg: 'Database Offline. Impossibile pubblicare.', type: 'error'});
        return;
    }

    if (!title || !desc || !location) {
        setToast({msg: 'Compila titolo, descrizione e zona.', type: 'error'});
        return;
    }

    setIsSubmitting(true);
    setToast({msg: 'Connessione al database in corso...', type: 'info'});

    // Timeout safety
    const timeoutId = setTimeout(() => {
        setIsSubmitting(false);
        setToast({msg: 'TIMEOUT: Il database è lento a svegliarsi. Riprova tra poco.', type: 'error'});
    }, 40000); 

    const newRequest: JobRequest = {
        id: `req_${Date.now()}`,
        clientId: currentUser.email,
        clientName: currentUser.name,
        clientAvatar: currentUser.avatar || '',
        category,
        title,
        description: desc,
        location,
        budget: budget || 'Da concordare',
        images: ['https://picsum.photos/400/300?random=' + Math.floor(Math.random() * 100)],
        status: 'open',
        candidates: [],
        createdAt: new Date().toISOString()
    };

    try {
        const res = await saveRequest(newRequest);
        clearTimeout(timeoutId); // Clear timeout if successful
        
        if (res.success) {
            setToast({msg: 'Richiesta pubblicata!', type: 'success'});
            setTitle('');
            setDesc('');
            setBudget('');
            setLocation('');
            
            setTimeout(() => {
                setToast(null);
                setMode('dashboard'); 
            }, 1500);
        } else {
            if (res.error === 'PERMISSIONS_DENIED') {
                 setToast({msg: 'ERRORE PERMESSI (RLS). Esegui SQL su Supabase.', type: 'error'});
            } else if (res.error === 'TABLE_MISSING') {
                 setToast({msg: 'ERRORE: Tabelle Database non trovate.', type: 'error'});
            } else if (res.error === 'TIMEOUT_DB_SLOW') {
                 setToast({msg: 'TIMEOUT: Il database si sta svegliando. Riprova!', type: 'error'});
            } else {
                 setToast({msg: `Errore Database: ${res.error}`, type: 'error'});
            }
        }
    } catch (e) {
        clearTimeout(timeoutId);
        setToast({msg: 'Errore di connessione imprevisto.', type: 'error'});
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isClient) {
      return (
        <div className="p-6 pb-24 flex flex-col items-center justify-center h-full text-center">
             <div className="bg-orange-100 p-4 rounded-full mb-4">
                 <Briefcase className="w-8 h-8 text-orange-600" />
             </div>
             <h2 className="text-xl font-bold text-gray-900 mb-2">Sezione per i Clienti</h2>
             <p className="text-gray-600 max-w-xs">
                 Solo chi è registrato come <b>Cliente</b> può pubblicare richieste di lavoro.
             </p>
        </div>
      );
  }

  // --- DASHBOARD VIEW ---
  if (mode === 'dashboard') {
      return (
        <div className="bg-gray-50 min-h-full pb-24">
             <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
                 <h2 className="text-xl font-bold text-gray-900">Le mie Richieste</h2>
                 <div className="flex gap-2">
                    <button onClick={loadMyRequests} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
                    <button 
                        onClick={() => setMode('new')}
                        className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"
                    >
                        + Nuova
                    </button>
                 </div>
             </div>
             
             <div className="p-4 space-y-4">
                 {isLoading && myRequests.length === 0 && (
                     <div className="text-center py-10"><RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500"/></div>
                 )}
                 
                 {!isLoading && myRequests.length === 0 ? (
                     <div className="text-center py-10 text-gray-400">
                         <List className="w-12 h-12 mx-auto mb-2 opacity-50" />
                         <p>Non hai ancora pubblicato richieste.</p>
                     </div>
                 ) : (
                     myRequests.map(req => {
                         let statusColor = 'bg-blue-100 text-blue-800';
                         let statusText = 'Aperta';
                         if (req.status === 'in_progress') { statusColor = 'bg-orange-100 text-orange-800'; statusText = 'In Corso'; }
                         if (req.status === 'completed') { statusColor = 'bg-green-100 text-green-800'; statusText = 'Completata'; }

                         return (
                            <div key={req.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColor}`}>{statusText}</span>
                                    <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-bold text-gray-900">{req.title}</h3>
                                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {req.location}
                                </p>
                                
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 text-sm">
                                    <div className="text-gray-600">
                                        Budget: <span className="font-semibold text-gray-900">{req.budget}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-gray-600">
                                        <Briefcase className="w-4 h-4" />
                                        {req.status === 'open' 
                                            ? `${req.candidates.length} candidati` 
                                            : `Assegnato a ${req.assignedPro}`}
                                    </div>
                                </div>
                            </div>
                         );
                     })
                 )}
             </div>
        </div>
      );
  }

  // --- NEW REQUEST FORM ---
  return (
    <div className="bg-gray-50 min-h-full pb-24">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Nuova Richiesta</h2>
            <button 
            onClick={() => {
                if(!isSubmitting) setMode('dashboard');
            }}
            disabled={isSubmitting}
            className="text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200"
            >
                Le mie Richieste
            </button>
      </div>

      <div className="p-6">
        <p className="text-gray-500 text-sm mb-6">
            Descrivi di cosa hai bisogno e ricevi proposte dai professionisti.
        </p>

        {!cloudStatus && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4 flex items-center gap-3">
                <WifiOff className="w-6 h-6 text-red-500" />
                <div className="text-sm text-red-700">
                    <b>Database Offline</b><br/>Impossibile pubblicare richieste al momento.
                </div>
            </div>
        )}

        <form onSubmit={handlePublish} className="space-y-4">
            
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
                <option>Idraulico</option>
                <option>Elettricista</option>
                <option>Imbianchino</option>
                <option>Muratore</option>
                <option>Tuttofare</option>
                <option>Giardiniere</option>
            </select>
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titolo Annuncio</label>
            <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Es. Perdita acqua bagno"
                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zona / Città</label>
            <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Es. Milano Centro, Via Roma..."
                    className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>
            </div>

            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione Dettagliata</label>
            <textarea 
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Spiega il problema, le misure, o il risultato desiderato..."
                rows={4}
                className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Previsto (Opzionale)</label>
                <input 
                    type="text" 
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Es. 100€ o 'Da valutare'"
                    className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
            </div>

            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-400 cursor-pointer hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm">Aggiungi Foto (Simulato)</span>
            </div>

            <button 
            type="submit" 
            disabled={!title || !desc || !location || isSubmitting || !cloudStatus}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors mt-4
                ${title && desc && location && !isSubmitting && cloudStatus
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
            `}
            >
            {isSubmitting ? (
                <span>Caricamento...</span>
            ) : (
                <>
                <PlusCircle className="w-5 h-5" />
                Pubblica Richiesta
                </>
            )}
            </button>
        </form>

        {toast && (
            <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 text-white text-xs py-3 px-4 rounded-xl shadow-2xl animate-fade-in-up z-50 w-max max-w-[90%] text-center flex items-center gap-2 font-bold ${toast.type === 'error' ? 'bg-red-600' : (toast.type === 'info' ? 'bg-blue-600' : 'bg-green-600')}`}>
                {toast.type === 'error' ? <XCircle className="w-5 h-5 min-w-[20px]" /> : (toast.type === 'info' ? <RefreshCw className="w-5 h-5 min-w-[20px] animate-spin" /> : <CheckCircle className="w-5 h-5 min-w-[20px]" />)}
                <span>{toast.msg}</span>
            </div>
        )}
      </div>
    </div>
  );
};
