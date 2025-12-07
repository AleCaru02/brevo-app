
import { User, Job, Review, Post, ChatThread, JobRequest, Role } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://rtxhpxqsnaxdiomyqsem.supabase.co';
const SUPABASE_KEY = 'IeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0eGhweHFzbmF4ZGlvbXlxc2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTc1NjAsImV4cCI6MjA4MDY5MzU2MH0.fq64nzOhQhDN26lQp5EBB4_WO8A8f6aMhYcdAEmf0Qo'; // <--- IMPORTANTE: INSERISCI LA TUA CHIAVE QUI

const ENABLE_CLOUD = !!SUPABASE_KEY;

let supabase: any = null;
if (ENABLE_CLOUD) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
    console.warn("Supabase Key missing. Running in LOCAL ONLY mode.");
}

const KEYS = {
  USER: 'bravo_current_user',
  USERS_DB: 'bravo_users_db',
  JOBS: 'bravo_jobs',
  REVIEWS: 'bravo_reviews',
  CHATS: 'bravo_chats',
  REQUESTS: 'bravo_requests',
  PLATFORM_STATS: 'bravo_platform_revenue'
};

const COMMISSION_RATE = 0.05;

// --- Mock Data (Fallback) ---
const SAMPLE_POSTS: Post[] = [
  {
    id: '1',
    category: 'Idraulico',
    title: 'Rifacimento completo bagno',
    image: 'https://picsum.photos/400/300?random=1',
    professional: {
      name: 'Mario Rossi',
      avatar: 'https://ui-avatars.com/api/?name=Mario+Rossi&background=0D8ABC&color=fff',
      city: 'Milano',
      distance: '2 km da te',
      responseTime: 'Entro 1 ora',
      isVerified: true
    },
  },
  // ... other samples can stay for demo purposes if DB is empty
];

// --- HELPER FOR DB ACCESS ---
// This enables Hybrid mode: uses Supabase if configured, otherwise localStorage

async function fetchTable<T>(tableName: string, localKey: string): Promise<T[]> {
    if (ENABLE_CLOUD) {
        try {
            const { data, error } = await supabase.from(tableName).select('*');
            if (error) throw error;
            // Unpack payload from SQL row { id, payload: {...} }
            return data.map((row: any) => row.payload) as T[];
        } catch (e) {
            console.error(`Error fetching ${tableName}:`, e);
            return [];
        }
    } else {
        // Local Fallback
        return JSON.parse(localStorage.getItem(localKey) || '[]');
    }
}

async function saveItem<T extends { id?: string, email?: string }>(tableName: string, localKey: string, item: T, idField: keyof T = 'id') {
    if (ENABLE_CLOUD) {
        try {
            const id = item[idField] as string;
            // Upsert: row key matches the table Primary Key (email for users, id for others)
            await supabase.from(tableName).upsert({ [idField]: id, payload: item });
        } catch (e) {
            console.error(`Error saving to ${tableName}:`, e);
        }
    }
    
    // Always save local as backup/cache
    const list = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = list.findIndex((x: any) => x[idField] === item[idField]);
    if (idx > -1) list[idx] = item;
    else list.push(item);
    localStorage.setItem(localKey, JSON.stringify(list));
}

// --- USERS ---

export const getAllRegisteredUsers = async (): Promise<User[]> => {
    return await fetchTable<User>('bravo_users', KEYS.USERS_DB);
}

export const registerUser = async (user: User) => {
    const users = await getAllRegisteredUsers();
    const exists = users.find(u => u.email === user.email);
    if (exists) return false;

    user.verificationStatus = 'none';
    user.isVerified = false;
    user.walletBalance = 0;

    await saveItem('bravo_users', KEYS.USERS_DB, user, 'email');
    return true;
}

export const loginUserByEmail = async (email: string): Promise<User | null> => {
    // Direct fetch optimization
    if (ENABLE_CLOUD) {
        const { data } = await supabase.from('bravo_users').select('*').eq('email', email).single();
        return data ? data.payload : null;
    }
    const users = await getAllRegisteredUsers();
    return users.find(u => u.email === email) || null;
}

export const getCurrentUser = (): User | null => {
    // Current user session is always local for performance
    const stored = localStorage.getItem(KEYS.USER);
    return stored ? JSON.parse(stored) : null;
};

export const saveCurrentUser = async (user: User) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    await saveItem('bravo_users', KEYS.USERS_DB, user, 'email');
    window.dispatchEvent(new Event('storage'));
};

export const switchUserRole = async (newRole: Role) => {
    const user = getCurrentUser();
    if (user) {
        user.role = newRole;
        await saveCurrentUser(user);
        return user;
    }
    return null;
}

export const logoutUser = () => {
    localStorage.removeItem(KEYS.USER);
};

// --- POSTS / PROS ---

export const getReviewStats = async (proName: string) => {
    const allReviews = await fetchTable<Review>('bravo_reviews', KEYS.REVIEWS);
    // In SQL we would use .eq('proName', proName), but here payload is JSONB so filter client side
    // Actually our Review object doesn't have proName inside it in the type def? 
    // Wait, the previous storage implementation stored it as a Map key.
    // Let's adjust: We will store Reviews with a proName field in the DB payload.
    
    // Correction: storage used KEYS.REVIEWS as a map { "ProName": [Review] }
    // In DB we should store flat list of reviews with proName property.
    // Let's assume we filter local reviews by checking which ones belong to pro.
    // Since types.ts Review doesn't have 'professionalName', we must infer it or update type.
    // For this transition, let's look at how addReview works.
    
    // Hack: We will filter based on payload structure which we will enforce to have proName
    const proReviews = allReviews.filter((r: any) => r.professionalName === proName);
    
    const count = proReviews.length;
    const average = count > 0 
      ? (proReviews.reduce((acc, curr) => acc + curr.rating, 0) / count).toFixed(1) 
      : '0.0';
      
    return { count, rating: parseFloat(average), reviews: proReviews };
};

export const getPosts = async (): Promise<Post[]> => {
    const users = await getAllRegisteredUsers();
    const registeredPros = users.filter(u => u.role === 'professionista');

    // If no pros in DB, show samples (Demomode)
    if (registeredPros.length === 0 && !ENABLE_CLOUD) return SAMPLE_POSTS;

    // Convert Users to Posts
    const realPosts: Post[] = await Promise.all(registeredPros.map(async pro => {
        const stats = await getReviewStats(pro.name);
        return {
            id: pro.email, // use email as ID for post
            category: pro.bio.includes('Idraulico') ? 'Idraulico' : 'Tuttofare', // Simple inference or add category to User
            title: pro.bio || 'Professionista disponibile',
            image: `https://picsum.photos/400/300?random=${pro.name.length}`,
            professional: {
                name: pro.name,
                avatar: pro.avatar || '',
                city: pro.city || 'Italia',
                distance: 'Disponibile',
                responseTime: pro.availability || 'In giornata',
                isVerified: pro.isVerified,
                rating: stats.rating,
                reviewsCount: stats.count
            }
        };
    }));

    // Merge with samples if needed, or just return real
    return realPosts.length > 0 ? realPosts : SAMPLE_POSTS;
};

export const getTopPros = async (limit: number = 10): Promise<Post[]> => {
    const posts = await getPosts();
    return posts.sort((a, b) => {
        const ratingA = a.professional.rating || 0;
        const ratingB = b.professional.rating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.professional.reviewsCount || 0) - (a.professional.reviewsCount || 0);
    }).slice(0, limit);
}

// --- REVIEWS ---

export const addReview = async (proName: string, review: Review) => {
    // Inject proName into the review object for flat storage
    const reviewWithPro = { ...review, professionalName: proName };
    await saveItem('bravo_reviews', KEYS.REVIEWS, reviewWithPro);
};

export const addReviewResponse = async (proName: string, reviewId: string, responseText: string) => {
    // Fetch, update, save
    const all = await fetchTable<Review>('bravo_reviews', KEYS.REVIEWS);
    const target = all.find(r => r.id === reviewId);
    if (target) {
        target.response = responseText;
        await saveItem('bravo_reviews', KEYS.REVIEWS, target);
    }
};

export const canReview = async (clientName: string, proName: string): Promise<boolean> => {
    const jobs = await fetchTable<Job>('bravo_jobs', KEYS.JOBS);
    const job = jobs.find(j => 
      j.clientName === clientName && 
      j.professionalName === proName && 
      j.status === 'completed' && 
      !j.clientReviewed
    );
    return !!job;
};

export const markJobAsReviewed = async (clientName: string, proName: string) => {
    const jobs = await fetchTable<Job>('bravo_jobs', KEYS.JOBS);
    const job = jobs.find(j => 
        j.clientName === clientName && 
        j.professionalName === proName && 
        j.status === 'completed' && 
        !j.clientReviewed
    );
    if (job) {
        job.clientReviewed = true;
        await saveItem('bravo_jobs', KEYS.JOBS, job);
    }
};

// --- JOBS ---

export const getJobs = async (): Promise<Job[]> => {
    return await fetchTable<Job>('bravo_jobs', KEYS.JOBS);
};

export const saveJob = async (job: Job) => {
    await saveItem('bravo_jobs', KEYS.JOBS, job);
};

export const setJobCompleted = async (jobId: string, role: Role, workReport?: string): Promise<{ job: Job, isFullyCompleted: boolean } | null> => {
    const jobs = await getJobs();
    const job = jobs.find(j => j.id === jobId);
    
    if (job) {
        if (role === 'cliente') job.clientCompleted = true;
        if (role === 'professionista') {
            job.proCompleted = true;
            if (workReport) job.workReport = workReport;
        }

        let isFullyCompleted = false;

        if (job.clientCompleted && job.proCompleted && job.status !== 'completed') {
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            isFullyCompleted = true;
            
            if (job.escrowStatus === 'held') {
                job.escrowStatus = 'released';
                const total = job.price;
                const commission = total * COMMISSION_RATE;
                const proEarning = total - commission;
                job.commissionAmount = commission;

                // Update Stats (Not atomic in this simplified version)
                // const currentRevenue = ... (Handling platform stats via Supabase would require a separate singleton table)

                // Update Pro Wallet
                const users = await getAllRegisteredUsers();
                const pro = users.find(u => u.name === job.professionalName);
                if (pro) {
                    pro.walletBalance = (pro.walletBalance || 0) + proEarning;
                    await saveItem('bravo_users', KEYS.USERS_DB, pro, 'email');
                    
                    const currentUser = getCurrentUser();
                    if (currentUser && currentUser.name === job.professionalName) {
                        currentUser.walletBalance = pro.walletBalance;
                        localStorage.setItem(KEYS.USER, JSON.stringify(currentUser));
                    }
                }
            }

            if (job.requestId) {
                const reqs = await getRequests();
                const req = reqs.find(r => r.id === job.requestId);
                if (req) {
                    req.status = 'completed';
                    await saveItem('bravo_requests', KEYS.REQUESTS, req);
                }
            }
        }

        await saveItem('bravo_jobs', KEYS.JOBS, job);
        return { job, isFullyCompleted };
    }
    return null;
}

// --- CHATS ---

export const getChats = async (): Promise<ChatThread[]> => {
    return await fetchTable<ChatThread>('bravo_chats', KEYS.CHATS);
}

export const saveChat = async (updatedChat: ChatThread) => {
    await saveItem('bravo_chats', KEYS.CHATS, updatedChat);
}

// --- REQUESTS ---

export const getRequests = async (): Promise<JobRequest[]> => {
    return await fetchTable<JobRequest>('bravo_requests', KEYS.REQUESTS);
};

export const saveRequest = async (req: JobRequest) => {
    await saveItem('bravo_requests', KEYS.REQUESTS, req);
};

export const applyToRequest = async (requestId: string, proName: string) => {
    const reqs = await getRequests();
    const req = reqs.find(r => r.id === requestId);
    if (req && req.status === 'open' && !req.candidates.includes(proName)) {
        req.candidates.push(proName);
        await saveItem('bravo_requests', KEYS.REQUESTS, req);
        return true;
    }
    return false;
};

export const acceptProposal = async (requestId: string, proName: string, clientName: string, price: number) => {
    const reqs = await getRequests();
    const req = reqs.find(r => r.id === requestId);
    if (req && req.status === 'open') {
        req.status = 'in_progress';
        req.assignedPro = proName;
        await saveItem('bravo_requests', KEYS.REQUESTS, req);

        const newJob: Job = {
            id: `job_${Date.now()}`,
            professionalName: proName,
            clientName: clientName,
            status: 'in_progress',
            clientCompleted: false,
            proCompleted: false,
            clientReviewed: false,
            createdAt: new Date().toISOString(),
            requestId: requestId,
            price: price,
            escrowStatus: 'held',
            commissionAmount: 0
        };
        await saveJob(newJob);
        return newJob;
    }
    return null;
};

// --- ADMIN ---

export const getDashboardStats = async () => {
    const users = await getAllRegisteredUsers();
    const jobs = await getJobs();
    const allReviews = await fetchTable<Review>('bravo_reviews', KEYS.REVIEWS);
    
    // Revenue calc from completed jobs
    const totalRevenue = jobs.reduce((acc, job) => acc + (job.commissionAmount || 0), 0);
    
    const pendingVerifications = users.filter(u => u.verificationStatus === 'pending');

    return {
        usersCount: users.length,
        prosCount: users.filter(u => u.role === 'professionista').length,
        clientsCount: users.filter(u => u.role === 'cliente').length,
        jobsCount: jobs.length,
        reviewsCount: allReviews.length,
        totalRevenue,
        users,
        pendingVerifications
    }
}

export const approveVerification = async (email: string) => {
    const users = await getAllRegisteredUsers();
    const user = users.find(u => u.email === email);
    if (user) {
        user.verificationStatus = 'verified';
        user.isVerified = true;
        await saveItem('bravo_users', KEYS.USERS_DB, user, 'email');
        return true;
    }
    return false;
}

export const requestVerification = async (email: string) => {
    return true;
}

export const resetDatabase = async () => {
    if (ENABLE_CLOUD) {
        // Warning: This is dangerous. In a real app we'd need RLS policies.
        // Here we just empty the tables via Supabase if possible, or just local.
        alert("Reset su cloud non implementato per sicurezza. Pulisco solo la cache locale.");
    }
    localStorage.clear();
    window.location.reload();
}
