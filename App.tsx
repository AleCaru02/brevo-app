import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getCurrentUser } from './services/storage';
import { AuthScreen } from './components/AuthScreen';
import { HomeTab } from './components/HomeTab';
import { ProProfile } from './components/ProProfile';
import { ChatTab } from './components/ChatTab';
import { PublishTab } from './components/PublishTab';
import { ProfileTab } from './components/ProfileTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { AdminDashboard } from './components/AdminDashboard';
import { Home, MessageCircle, PlusSquare, User as UserIcon, Trophy } from 'lucide-react';

type Tab = 'home' | 'publish' | 'chats' | 'profile' | 'leaderboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isLoading, setIsLoading] = useState(true);
  
  // Navigation State
  const [viewProProfile, setViewProProfile] = useState<string | null>(null);
  const [initialChatPro, setInitialChatPro] = useState<{name: string, avatar: string, requestId?: string} | null>(null);

  useEffect(() => {
    const loadedUser = getCurrentUser();
    if (loadedUser) setUser(loadedUser);
    setIsLoading(false);

    const handleStorageChange = () => {
         const updatedUser = getCurrentUser();
         if (JSON.stringify(updatedUser) !== JSON.stringify(user)) {
             setUser(updatedUser);
         }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('home');
    setViewProProfile(null);
  };

  const navigateToPro = (name: string) => {
    setViewProProfile(name);
  };

  const handleOpenProfileFromChat = (name: string) => {
    setInitialChatPro(null); 
    setViewProProfile(name); 
  };

  const startChat = (name: string, avatar: string, requestId?: string) => {
    setInitialChatPro({ name, avatar, requestId });
    setViewProProfile(null);
    setActiveTab('chats');
  };

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;

  if (isAdminMode) {
      return <AdminDashboard onBack={() => setIsAdminMode(false)} />;
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} onAdmin={() => setIsAdminMode(true)} />;
  }

  return (
    <div className="max-w-md mx-auto h-[100dvh] bg-white shadow-2xl overflow-hidden flex flex-col relative text-gray-800 font-sans">
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar scroll-smooth">
        {activeTab === 'home' && !viewProProfile && (
          <HomeTab 
            currentUser={user} 
            onOpenProProfile={navigateToPro} 
            onOpenChat={startChat}
          />
        )}

        {activeTab === 'leaderboard' && !viewProProfile && (
            <LeaderboardTab onOpenProProfile={navigateToPro} />
        )}

        {viewProProfile && (
          <ProProfile 
            proName={viewProProfile} 
            currentUser={user}
            onBack={() => setViewProProfile(null)}
            onStartChat={startChat}
          />
        )}

        {activeTab === 'publish' && (
            <PublishTab 
                currentUser={user} 
                onSuccess={() => setActiveTab('home')}
            />
        )}
        
        {activeTab === 'chats' && (
          <ChatTab 
            currentUser={user} 
            initialChatProName={initialChatPro?.name}
            initialChatProAvatar={initialChatPro?.avatar}
            initialRequestId={initialChatPro?.requestId}
            onCloseDetail={() => setInitialChatPro(null)}
            onOpenProfile={handleOpenProfileFromChat} 
          />
        )}
        
        {activeTab === 'profile' && (
          <ProfileTab 
            currentUser={user} 
            onUpdateUser={setUser} 
            onLogout={handleLogout} 
          />
        )}
      </div>

      {!viewProProfile && !initialChatPro && (
        <div className="bg-white border-t border-gray-200 h-16 flex justify-around items-center px-1 z-30 shrink-0 safe-area-bottom">
          <NavButton 
            icon={<Home />} 
            label="Home" 
            isActive={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
          />
          <NavButton 
            icon={<Trophy />} 
            label="Classifica" 
            isActive={activeTab === 'leaderboard'} 
            onClick={() => setActiveTab('leaderboard')} 
          />
          <NavButton 
            icon={<PlusSquare />} 
            label={user.role === 'cliente' ? 'Richieste' : 'Vetrina'} 
            isActive={activeTab === 'publish'} 
            onClick={() => setActiveTab('publish')} 
          />
          <NavButton 
            icon={<MessageCircle />} 
            label="Chat" 
            isActive={activeTab === 'chats'} 
            onClick={() => setActiveTab('chats')} 
          />
          <NavButton 
            icon={<UserIcon />} 
            label="Profilo" 
            isActive={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </div>
      )}
    </div>
  );
};

const NavButton: React.FC<{ icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <div className={`w-5 h-5 ${isActive ? 'scale-110' : 'scale-100'} transition-transform duration-200`}>
        {React.cloneElement(icon as React.ReactElement<any>, { strokeWidth: isActive ? 3 : 2 })}
    </div>
    <span className="text-[9px] font-medium">{label}</span>
  </button>
);

export default App;