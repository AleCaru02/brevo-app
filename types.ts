
export type Role = 'cliente' | 'professionista';

export interface User {
  name: string; 
  role: Role;
  piva: string | null;
  email: string;
  phone: string;
  bio: string;
  avatar?: string;
  city?: string;
  password?: string; // New: Password field
  
  // New MVP Features
  isVerified?: boolean; // Spunta blu
  verificationStatus?: 'none' | 'pending' | 'verified' | 'rejected';
  walletBalance?: number; // Saldo disponibile (solo pro)
  availability?: string; // Es. "Lun-Ven 09:00-18:00"
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  text: string;
  date: string;
  response?: string;
  jobTitle?: string;
}

export interface Job {
  id: string;
  professionalName: string;
  clientName: string;
  status: 'in_progress' | 'completed';
  clientCompleted: boolean;
  proCompleted: boolean;
  clientReviewed: boolean;
  createdAt: string;
  completedAt?: string;
  requestId?: string;
  workReport?: string;
  
  // Payment Logic
  price: number; // Prezzo pattuito
  escrowStatus: 'held' | 'released'; // Soldi congelati o rilasciati
  commissionAmount: number; // Il 5% che tiene Bravo
}

export interface JobRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  category: string;
  title: string;
  description: string;
  location: string;
  budget: string;
  images: string[];
  status: 'open' | 'in_progress' | 'completed';
  candidates: string[];
  assignedPro?: string;
  createdAt: string;
}

export interface Post {
  id: string;
  category: string;
  title: string;
  image: string;
  professional: {
    name: string;
    avatar: string;
    city: string;
    distance: string;
    rating?: number;
    reviewsCount?: number;
    responseTime?: string;
    isVerified?: boolean; // Per UI
  };
}

export interface ChatMessage {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: string;
  isSystem?: boolean;
}

export interface ChatThread {
  id: string;
  professionalName: string;
  clientName?: string;
  avatar: string;
  lastMessage: string;
  time: string;
  messages: ChatMessage[];
  relatedRequestId?: string;
}
