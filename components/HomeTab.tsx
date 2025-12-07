
import React, { useState, useEffect } from 'react';
import { Post, User, JobRequest } from '../types';
import { getPosts, getRequests, applyToRequest, getTopPros } from '../services/storage';
import { Search, MapPin, Star, MessageCircle, Briefcase, Clock, Users, CheckCircle, Award, Filter, RefreshCcw } from 'lucide-react';

interface HomeTabProps {
  currentUser: User;
  onOpenProProfile: (name: string) => void;
  onOpenChat: (name: string, avatar: string, requestId?: string) => void;
}

const CATEGORIES = ['Tutti', 'Idraulico', 'Elettricista', 'Imbianchino', 'Muratore', 'Tuttofare', 'Fotografo', 'Video Maker', 'Giardiniere', 'Fabbro', 'Meccanico'];

export const HomeTab: React.FC<HomeTabProps> = ({ currentUser, onOpenProProfile, onOpenChat, }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tutti');
  const [refreshKey, setRefreshKey] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [posts, setPosts] = useState<Post[]>([]);
  const [requests, setRequests] = useState<JobRequest[]>([]);
  const [topPros, setTopPros] = useState<Post[]>([]);

  useEffect(() => {
    if (currentUser.city && !searchTerm) {
        setSearchTerm(currentUser.city);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
    // Auto refresh for live feel
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const loadData = async () => {
      // Don't set global loading on interval refresh to avoid flicker
      // setIsLoading(true); 
      const [p, r, t] = await Promise.all([
          getPosts(),
          getRequests(),
          getTopPros(10)
      ]);
      setPosts(p);
      setRequests(r);
      setTopPros(t);
      // setIsLoading(false);
  }

  const forceUpdate = () => {
      setIsLoading(true);
      loadData().then(() => setIsLoading(false));
  };

  // --- PRO VIEW ---
  if (currentUser.role === 'professionista') {
    const filteredRequests = requests.filter(req => {
        const matchesSearch = req.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              req.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              req.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = activeCategory === 'Tutti' || req.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const handleCandidate = async (req: JobRequest) => {
        if (req.status !== 'open') return;
        
        const alreadyApplied = req.candidates.includes(currentUser.name);
        if (!alreadyApplied) {
            await applyToRequest(req.id, currentUser.name);
            forceUpdate();
        }

        onOpenChat(req.clientName, req.clientAvatar, req.id);
    };

    return (
        <div className="bg-gray-50 min-h-full pb-20">
             <div className="sticky top-0 bg-white z-10 shadow-sm pb-2">
                <div className="p-4 pb-2">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-lg font-bold text-gray-900">Richieste nella tua zona</h2>
                        <button onClick={forceUpdate} className="p-1"><RefreshCcw className="w-4 h-4 text-gray-400" /></button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                        type="text"
                        placeholder="Cerca per titolo, categoria o città..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex overflow-x-auto px-4 pb-2 gap-2 hide-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            activeCategory === cat 
                            ? 'bg-green-600 text-white shadow-md shadow-green-200' 
                            : 'bg-white text-gray-600 border border-gray-200'
                        }`}
                        >
                        {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 space-y-4">
                {isLoading && <div className="text-center py-4"><div className="inline-block w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div></div>}
                
                {!isLoading && filteredRequests.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <p>Nessuna richiesta trovata a <b>"{searchTerm}"</b>.</p>
                        <button onClick={() => setSearchTerm('')} className="mt-2 text-green-600 font-bold text-sm">Mostra tutte</button>
                    </div>
                )}
                
                {filteredRequests.map(req => {
                    const amICandidate = req.candidates.includes(currentUser.name);
                    const isMyJob = req.assignedPro === currentUser.name;
                    const isTaken = req.status !== 'open' && !isMyJob;

                    return (
                        <div key={req.id} className={`bg-white rounded-xl p-4 shadow-sm border ${isMyJob ? 'border-green-500 ring-1 ring-green-100' : 'border-gray-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded">{req.category}</span>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" /> {req.location}
                                    </span>
                                </div>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-1">{req.title}</h3>
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{req.description}</p>
                            
                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                                <span className="font-bold text-gray-900">{req.budget}</span>
                                <span className="flex items-center gap-1">
                                    <Users className="w-4 h-4" /> {req.candidates.length} cand.
                                </span>
                            </div>

                            {req.images.length > 0 && (
                                <div className="mb-4 h-32 rounded-lg overflow-hidden">
                                    <img src={req.images[0]} className="w-full h-full object-cover" alt="Job" />
                                </div>
                            )}

                            {isMyJob ? (
                                <div className="w-full py-2 bg-green-100 text-green-700 font-bold rounded-lg text-center flex items-center justify-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Lavoro Assegnato a Te
                                </div>
                            ) : isTaken ? (
                                <div className="w-full py-2 bg-gray-100 text-gray-400 font-medium rounded-lg text-center">
                                    Lavoro già assegnato
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleCandidate(req)}
                                    className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors
                                        ${amICandidate 
                                            ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                                            : 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200'}
                                    `}
                                >
                                    {amICandidate ? (
                                        <>
                                            <MessageCircle className="w-4 h-4" />
                                            Candidato (Chat)
                                        </>
                                    ) : (
                                        <>
                                            <Briefcase className="w-4 h-4" />
                                            Candidati per il lavoro
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  }

  // --- CLIENT VIEW ---
  
  const filteredPosts = posts.filter(post => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      post.title.toLowerCase().includes(term) || 
      post.professional.name.toLowerCase().includes(term) ||
      post.professional.city.toLowerCase().includes(term) ||
      post.category.toLowerCase().includes(term);
    
    const matchesCategory = activeCategory === 'Tutti' || post.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-gray-50 min-h-full pb-20">
      <div className="sticky top-0 bg-white z-10 shadow-sm pb-2">
        <div className="p-4 pb-2">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Trova un professionista</h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca professionista, servizio o città..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex overflow-x-auto px-4 pb-2 gap-2 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* LEADERBOARD SECTION */}
        {activeCategory === 'Tutti' && !searchTerm && (
            <div className="mb-2">
                <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" />
                    I Migliori su Bravo
                </h3>
                <div className="flex overflow-x-auto gap-4 hide-scrollbar pb-2">
                    {topPros.map(pro => (
                        <div 
                            key={`leader-${pro.id}`} 
                            onClick={() => onOpenProProfile(pro.professional.name)}
                            className="flex-shrink-0 w-36 bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col items-center cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                        >
                            <img src={pro.professional.avatar} className="w-14 h-14 rounded-full mb-2 border-2 border-yellow-100 object-cover" alt={pro.professional.name} />
                            <h4 className="font-bold text-sm text-gray-900 truncate w-full text-center">{pro.professional.name}</h4>
                            <span className="text-xs text-gray-500 mb-1">{pro.category}</span>
                            <div className="flex items-center text-xs font-bold text-gray-800 bg-yellow-50 px-2 py-0.5 rounded-full mb-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current mr-1" />
                                {pro.professional.rating}
                            </div>
                            <span className="text-[10px] text-gray-400">{pro.professional.city}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* FEED */}
        <div>
            {activeCategory === 'Tutti' && (
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-md font-bold text-gray-900">
                        {searchTerm ? 'Risultati ricerca' : 'Tutti i professionisti'}
                    </h3>
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                            Cancella filtri
                        </button>
                    )}
                </div>
            )}
            
            <div className="space-y-4">
                {isLoading && filteredPosts.length === 0 && <div className="text-center py-4">Caricamento...</div>}

                {!isLoading && filteredPosts.length > 0 ? (
                filteredPosts.map(post => (
                    <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="h-48 overflow-hidden relative">
                        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-bold">
                            {post.category}
                        </div>
                    </div>
                    
                    <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-900 mb-1 leading-tight">{post.title}</h3>
                        
                        <div className="flex items-center justify-between mt-3">
                        <button 
                            onClick={() => onOpenProProfile(post.professional.name)}
                            className="flex items-center gap-2 group text-left"
                        >
                            <img 
                                src={post.professional.avatar}
                                alt={post.professional.name}
                                className="w-10 h-10 rounded-full border border-gray-100 object-cover"
                            />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{post.professional.name}</span>
                                <div className="flex items-center text-xs text-gray-500">
                                    <MapPin className="w-3 h-3 mr-0.5" />
                                    {post.professional.city}
                                </div>
                            </div>
                        </button>

                        <div className="text-right">
                             <div className="flex items-center justify-end gap-1 font-bold text-gray-900 text-sm">
                                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                {post.professional.rating || 'N/A'}
                             </div>
                             <span className="text-[10px] text-gray-400">{post.professional.reviewsCount || 0} recensioni</span>
                        </div>
                        </div>
                        
                        <div className="mt-4 pt-3 border-t border-gray-50 flex gap-2">
                            <button 
                                onClick={() => onOpenProProfile(post.professional.name)}
                                className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs rounded-lg transition-colors"
                            >
                                Vedi Profilo
                            </button>
                            <button 
                                onClick={() => onOpenChat(post.professional.name, post.professional.avatar)}
                                className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="w-3 h-3" />
                                Chat
                            </button>
                        </div>
                    </div>
                    </div>
                ))
                ) : (
                    <div className="text-center py-12 text-gray-400">
                         <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                            <Search className="w-8 h-8 opacity-40" />
                         </div>
                        <p>Nessun professionista trovato.</p>
                        <button onClick={() => {setSearchTerm(''); setActiveCategory('Tutti');}} className="text-blue-600 font-bold text-sm mt-2">Resetta filtri</button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
