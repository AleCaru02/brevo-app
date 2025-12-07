
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { saveCurrentUser, logoutUser, switchUserRole, requestVerification } from '../services/storage';
import { LogOut, Save, User as UserIcon, RefreshCw, Camera, Wallet, Clock, BadgeCheck, FileText, Upload } from 'lucide-react';

interface ProfileTabProps {
  currentUser: User;
  onUpdateUser: (u: User) => void;
  onLogout: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ currentUser, onUpdateUser, onLogout }) => {
  const [formData, setFormData] = useState<User>(currentUser);
  const [message, setMessage] = useState('');

  // Sync local state when prop changes (Fixes switch lag)
  useEffect(() => {
    setFormData(currentUser);
  }, [currentUser]);

  const handleChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await saveCurrentUser(formData);
    onUpdateUser(formData);
    setMessage('Modifiche salvate ✅');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLogout = () => {
    logoutUser();
    onLogout();
  };

  const handleSwitchRole = async () => {
      const newRole: Role = currentUser.role === 'cliente' ? 'professionista' : 'cliente';
      const updatedUser = await switchUserRole(newRole);
      if (updatedUser) {
          onUpdateUser(updatedUser);
          setFormData(updatedUser);
      }
  }

  const handleVerificationRequest = () => {
      if (formData.verificationStatus !== 'none') return;
      // Simulate upload
      setTimeout(async () => {
          await requestVerification(formData.email);
          setFormData(prev => ({ ...prev, verificationStatus: 'pending' }));
          setMessage('Documenti inviati! In attesa di approvazione.');
      }, 1000);
  }

  return (
    <div className="bg-gray-50 min-h-full pb-24">
      {/* Header with Switcher */}
      <div className="bg-white p-4 flex justify-end shadow-sm">
          <button 
            onClick={handleSwitchRole}
            className="flex items-center gap-2 text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors text-gray-700"
          >
              <RefreshCw className="w-3 h-3" />
              Cambia in {currentUser.role === 'cliente' ? 'Professionista' : 'Cliente'}
          </button>
      </div>

      <div className="p-6">
        <div className="flex flex-col items-center mb-8">
            <div className="relative group">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-md">
                    <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mt-3 flex items-center gap-1">
                {formData.name}
                {formData.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-50" />}
            </h2>
            <div className="flex gap-2 mt-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide border ${
                    formData.role === 'cliente' 
                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                    : 'bg-green-100 text-green-800 border-green-200'
                }`}>
                {formData.role}
                </span>
            </div>
        </div>

        {/* PRO ONLY: Wallet Section */}
        {formData.role === 'professionista' && (
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-2xl shadow-lg mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Saldo Disponibile
                    </span>
                    <span className="text-[10px] bg-gray-700 px-2 py-0.5 rounded text-gray-300">Commissione 5% applicata</span>
                </div>
                <div className="text-3xl font-bold">€ {formData.walletBalance?.toFixed(2)}</div>
                <div className="mt-4 flex gap-2">
                    <button className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-bold transition-colors">Prelievo</button>
                    <button className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded-lg text-xs font-bold transition-colors">Storico</button>
                </div>
            </div>
        )}

        {/* PRO ONLY: Verification Section */}
        {formData.role === 'professionista' && !formData.isVerified && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                    <BadgeCheck className="w-5 h-5 text-orange-500" />
                    Verifica Identità
                </h3>
                <p className="text-xs text-gray-500 mb-3">Ottieni la spunta blu e aumenta la fiducia dei clienti caricando un documento.</p>
                
                {formData.verificationStatus === 'pending' ? (
                    <div className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg text-xs font-bold text-center">
                        In attesa di approvazione...
                    </div>
                ) : (
                    <button 
                        onClick={handleVerificationRequest}
                        className="w-full bg-orange-50 text-orange-600 border border-orange-200 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-100"
                    >
                        <Upload className="w-4 h-4" /> Carica Documento
                    </button>
                )}
            </div>
        )}

        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gray-500" />
                Dati Personali
            </h3>
            
            <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Nome</label>
            <input 
                type="text" 
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
            />
            </div>

            {formData.role === 'professionista' && (
                 <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Disponibilità / Orari
                    </label>
                    <input 
                        type="text" 
                        value={formData.availability || ''}
                        onChange={(e) => handleChange('availability', e.target.value)}
                        placeholder="Es. Lun-Ven 9:00 - 18:00"
                        className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
                    />
                </div>
            )}

            <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Città</label>
            <input 
                type="text" 
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 transition-colors bg-transparent"
            />
            </div>

            <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">Bio</label>
            <textarea 
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-blue-500 transition-colors resize-none bg-transparent"
            />
            </div>
        </div>

        <div className="mt-6 space-y-3">
            <button 
            onClick={handleSave}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200"
            >
            <Save className="w-5 h-5" />
            Salva Modifiche
            </button>

            {message && <p className="text-green-600 text-center text-sm font-bold animate-pulse">{message}</p>}

            <button 
            onClick={handleLogout}
            className="w-full border border-red-200 text-red-600 bg-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors"
            >
            <LogOut className="w-5 h-5" />
            Esci
            </button>
        </div>
      </div>
    </div>
  );
};
 
