
import React, { useState, useEffect } from 'react';
import { getDashboardStats, resetDatabase, approveVerification } from '../services/storage';
import { Trash2, ArrowLeft, Users, Briefcase, Star, Database, BadgeCheck, DollarSign } from 'lucide-react';

interface AdminDashboardProps {
    onBack: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
             const s = await getDashboardStats();
             setStats(s);
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleApprove = async (email: string) => {
        await approveVerification(email);
        const s = await getDashboardStats();
        setStats(s); // Force refresh
    }

    if (!stats) return <div className="p-8 text-center text-gray-500 font-bold">Caricamento Dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 font-bold bg-white px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50"
                    >
                        <ArrowLeft className="w-5 h-5" /> Torna all'App
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Developer Dashboard</h1>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase">Utenti</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.usersCount}</h3>
                            </div>
                            <Users className="w-6 h-6 text-blue-200" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase">Ricavi (5%)</p>
                                <h3 className="text-2xl font-bold text-gray-900">€{stats.totalRevenue.toFixed(2)}</h3>
                            </div>
                            <DollarSign className="w-6 h-6 text-green-200" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase">Lavori</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.jobsCount}</h3>
                            </div>
                            <Briefcase className="w-6 h-6 text-orange-200" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
                         <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-500 text-xs font-bold uppercase">Recensioni</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stats.reviewsCount}</h3>
                            </div>
                            <Star className="w-6 h-6 text-yellow-200" />
                        </div>
                    </div>
                </div>

                {/* Pending Verifications */}
                {stats.pendingVerifications.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border border-orange-200">
                         <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                            <h3 className="font-bold text-orange-800 flex items-center gap-2">
                                <BadgeCheck className="w-5 h-5" /> Richieste Verifica Pendenti
                            </h3>
                        </div>
                        <div className="p-4">
                            {stats.pendingVerifications.map((u: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-lg mb-2">
                                    <div className="flex items-center gap-3">
                                        <img src={u.avatar} className="w-10 h-10 rounded-full" />
                                        <div>
                                            <p className="font-bold text-sm">{u.name}</p>
                                            <p className="text-xs text-gray-500">{u.email}</p>
                                            <p className="text-xs text-gray-400">Documento: ID_CARD_SIMULATION.jpg</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleApprove(u.email)}
                                        className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700"
                                    >
                                        Approva
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dangerous Actions */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
                    <h3 className="text-red-800 font-bold mb-2 flex items-center justify-center gap-2">
                        <Database className="w-5 h-5" />
                        Zona Pericolo
                    </h3>
                    <p className="text-red-600 text-sm mb-4">
                        Puoi resettare l'intero database locale. Questo cancellerà tutti gli utenti, lavori, chat e recensioni.
                    </p>
                    <button 
                        onClick={() => {
                            if(window.confirm('Sei sicuro di voler cancellare TUTTI i dati?')) {
                                resetDatabase();
                            }
                        }}
                        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 shadow-lg shadow-red-200 flex items-center gap-2 mx-auto"
                    >
                        <Trash2 className="w-4 h-4" />
                        Reset Database Completo
                    </button>
                </div>
            </div>
        </div>
    );
};
