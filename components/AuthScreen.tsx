
import React, { useState } from 'react';
import { User, Role } from '../types';
import { saveCurrentUser, loginUserByEmail, registerUser, isCloudConnected } from '../services/storage';
import { MapPin, Lock, Chrome, Wifi, WifiOff, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User) => void;
  onAdmin: () => void;
}

const CITIES = ['Milano', 'Roma', 'Napoli', 'Torino', 'Palermo', 'Bologna', 'Firenze', 'Bari', 'Catania', 'Venezia', 'Verona', 'Messina', 'Padova', 'Trieste'];

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onAdmin }) => {
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCloud, setIsCloud] = useState(isCloudConnected());
  const [showPassword, setShowPassword] = useState(false);
  
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('cliente');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Milano'); 
  const [piva, setPiva] = useState('');
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        if (isLoginMode) {
            if (!email || !password) {
                setError('Inserisci email e password.');
                setIsLoading(false);
                return;
            }

            if (email.toLowerCase() === 'admin@bravo.com') {
                onAdmin();
                return;
            }

            const res = await loginUserByEmail(email, password);
            if (res.success && res.user) {
                await saveCurrentUser(res.user);
                onLogin(res.user);
            } else {
                setError(res.msg || 'Credenziali non valide.');
            }

        } else {
            if (!name.trim() || !email.trim() || !phone.trim() || !city.trim() || !password.trim()) {
                setError('Inserisci tutti i campi obbligatori.');
                setIsLoading(false);
                return;
            }

            if (role === 'professionista' && !piva.trim()) {
                setError('Per registrarti come professionista devi inserire una Partita IVA.');
                setIsLoading(false);
                return;
            }

            const newUser: User = {
                name,
                role,
                piva: role === 'professionista' ? piva : null,
                email,
                phone,
                city,
                password, // Saving plain for demo
                bio: role === 'professionista' ? `Professionista operativo a ${city}` : `Cliente di ${city}`,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${role === 'cliente' ? '007AFF' : '10b981'}&color=fff`,
                walletBalance: 0,
                verificationStatus: 'none'
            };

            const res = await registerUser(newUser);
            if (res.success) {
                await saveCurrentUser(newUser);
                onLogin(newUser);
            } else {
                if (res.msg === 'EXISTS') setError('Questa email è già registrata. Prova ad accedere.');
                else if (res.msg === 'RLS_ERROR') setError('PERMESSI NEGATI (RLS). Esegui lo script SQL "GRANT ALL" su Supabase.');
                else if (res.msg === 'TABLE_MISSING') setError('TABELLE MANCANTI. Esegui il "CREATE TABLE" su Supabase.');
                else setError(`Errore Database: ${res.msg}`);
            }
        }
    } catch (e) {
        setError('Errore imprevisto. Controlla la console.');
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
      setIsLoading(true);
      
      setTimeout(async () => {
        const mockEmail = `mario.google@gmail.com`;
        const res = await loginUserByEmail(mockEmail);
        
        if (res.success && res.user) {
            await saveCurrentUser(res.user);
            onLogin(res.user);
        } else {
            const newUser: User = {
                name: `Mario Google`,
                role: 'cliente',
                piva: null,
                email: mockEmail,
                phone: '',
                city: 'Milano',
                bio: `Utente verificato con Google`,
                avatar: `https://ui-avatars.com/api/?name=Mario+Google&background=DB4437&color=fff`,
                verificationStatus: 'verified',
                isVerified: true,
                walletBalance: 0
            };
            const regRes = await registerUser(newUser);
            if (regRes.success || regRes.msg === 'EXISTS') {
                await saveCurrentUser(newUser);
                onLogin(newUser);
            } else {
                if (regRes.msg === 'TABLE_MISSING') setError('ERRORE: Tabelle mancanti su Supabase.');
                else setError('Errore login Google (Database non scrivibile).');
            }
        }
        setIsLoading(false);
      }, 1500);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-6 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm border border-gray-100">
          <span className={`w-2 h-2 rounded-full ${isCloud ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {isCloud ? 'Cloud Online' : 'Offline'}
          </span>
      </div>

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl relative animate-fade-in-up border border-gray-100">
        
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Bravo</h1>
          <p className="text-gray-500">Il Social dei Professionisti</p>
        </div>

        <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-lg p-3 text-gray-700 font-bold hover:bg-gray-50 transition-colors mb-6 shadow-sm active:scale-[0.98]"
        >
             {isLoading ? (
                 <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
             ) : (
                 <Chrome className="w-5 h-5 text-red-500" />
             )}
             {isLoading ? 'Attendi...' : 'Continua con Google'}
        </button>

        <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">oppure usa la tua email</span>
            </div>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
            <button 
                onClick={() => setIsLoginMode(false)}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isLoginMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Registrati
            </button>
            <button 
                onClick={() => setIsLoginMode(true)}
                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isLoginMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Accedi
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chi sei?</label>
                <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => setRole('cliente')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    role === 'cliente'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    Cliente
                </button>
                <button
                    type="button"
                    onClick={() => setRole('professionista')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                    role === 'professionista'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                    Professionista
                </button>
                </div>
            </div>
          )}

          {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome e Cognome</label>
                <input
                type="text"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Mario Rossi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                />
             </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
            type="email"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="mario@email.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />
         </div>

         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400"
                >
                    {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                </button>
            </div>
         </div>

         {!isLoginMode && (
            <>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                    <input
                    type="tel"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="333 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Città / Zona Operativa</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white text-gray-900 appearance-none relative z-0"
                            style={{ backgroundImage: 'none' }}
                        >
                            {CITIES.map(c => <option key={c} value={c} className="text-gray-900 bg-white">{c}</option>)}
                        </select>
                    </div>
                </div>

                {role === 'professionista' && (
                    <div className="animate-fade-in">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
                    <input
                        type="text"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
                        placeholder="IT12345678901"
                        value={piva}
                        onChange={(e) => setPiva(e.target.value)}
                    />
                    </div>
                )}
            </>
         )}

          {error && (
            <div className="text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-100 font-bold whitespace-pre-wrap">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full text-white font-bold py-3 rounded-lg hover:opacity-90 transition-all shadow-lg ${
                isLoginMode 
                    ? 'bg-gray-900 shadow-gray-400'
                    : (role === 'cliente' ? 'bg-blue-600 shadow-blue-200' : 'bg-green-600 shadow-green-200')
            } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Caricamento...' : (isLoginMode ? 'Accedi e Ricordami' : 'Registrati')}
          </button>
        </form>
        
        <div className="mt-6 flex justify-center">
            {isCloud ? (
                 <p className="text-[10px] text-green-600 flex items-center gap-1 font-bold">
                     <Wifi className="w-3 h-3" /> Connesso al Database
                 </p>
            ) : (
                 <p className="text-[10px] text-red-500 flex items-center gap-1 font-bold">
                     <WifiOff className="w-3 h-3" /> Database Offline
                 </p>
            )}
        </div>
      </div>
    </div>
  );
};
