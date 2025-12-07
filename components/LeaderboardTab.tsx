
import React, { useState, useEffect } from 'react';
import { getTopPros } from '../services/storage';
import { Post } from '../types';
import { MapPin, Star, Trophy, Clock, Search } from 'lucide-react';

interface LeaderboardTabProps {
    onOpenProProfile: (name: string) => void;
}

const CITIES = ['Milano', 'Roma', 'Napoli', 'Torino', 'Palermo', 'Bologna', 'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona', 'Messina', 'Padova', 'Trieste'];

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ onOpenProProfile }) => {
    const [selectedCity, setSelectedCity] = useState('');
    const [minRating, setMinRating] = useState(0);
    const [allPros, setAllPros] = useState<Post[]>([]);

    useEffect(() => {
        const fetchPros = async () => {
            const pros = await getTopPros(50);
            setAllPros(pros);
        };
        fetchPros();
    }, []);

    const filteredPros = allPros.filter(pro => {
        const matchesCity = selectedCity === '' || pro.professional.city.toLowerCase() === selectedCity.toLowerCase();
        const matchesRating = (pro.professional.rating || 0) >= minRating;
        return matchesCity && matchesRating;
    });

    return (
        <div className="bg-gray-50 min-h-full pb-20">
            <div className="bg-white p-4 sticky top-0 z-10 shadow-sm border-b border-gray-100">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Classifica
                </h1>
                
                {/* Filters */}
                <div className="space-y-3">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <select
                            value={selectedCity}
                            onChange={(e) => setSelectedCity(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-700"
                        >
                            <option value="">Tutte le città</option>
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
                        <span className="text-sm font-medium text-gray-500 whitespace-nowrap mr-1">Voto min:</span>
                        {[0, 3, 4, 4.5, 5].map(r => (
                            <button
                                key={r}
                                onClick={() => setMinRating(r)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 ${
                                    minRating === r 
                                    ? 'bg-yellow-500 text-white' 
                                    : 'bg-white border border-gray-200 text-gray-600'
                                }`}
                            >
                                {r === 0 ? 'Tutti' : <>{r} <Star className="w-3 h-3 fill-current" /></>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-3">
                {filteredPros.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>Nessun professionista trovato con questi filtri.</p>
                    </div>
                ) : (
                    filteredPros.map((post, index) => (
                        <div 
                            key={post.id}
                            onClick={() => onOpenProProfile(post.professional.name)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
                            
                            <div className="relative">
                                <img src={post.professional.avatar} alt={post.professional.name} className="w-16 h-16 rounded-full border-2 border-white shadow-sm" />
                                <div className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
                                    #{index + 1}
                                </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">{post.professional.name}</h3>
                                <p className="text-xs text-blue-600 font-medium mb-1">{post.category}</p>
                                
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {post.professional.city}
                                    </span>
                                    <span className="flex items-center gap-1 text-green-600 font-medium">
                                        <Clock className="w-3 h-3" /> {post.professional.responseTime || '1 ora'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center bg-yellow-50 px-3 py-2 rounded-xl">
                                <div className="flex items-center gap-1 font-bold text-lg text-gray-900">
                                    {post.professional.rating} <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                </div>
                                <span className="text-[10px] text-gray-500 whitespace-nowrap">{post.professional.reviewsCount} recensioni</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
