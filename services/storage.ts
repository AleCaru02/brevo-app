
import { User, Job, Review, Post, ChatThread, JobRequest, Role } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://rtxhpxqsnaxdiomyqsem.supabase.co';
// FIXED KEY: Correct anon key provided
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0eGhweHFzbmF4ZGlvbXlxc2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTc1NjAsImV4cCI6MjA4MDY5MzU2MH0.fq64nzOhQhDN26lQp5EBB4_WO8A8f6aMhYcdAEmf0Qo';

// Force Cloud mode if keys are present
const ENABLE_CLOUD = !!SUPABASE_URL && !!SUPABASE_KEY;

let supabase: any = null;
if (ENABLE_CLOUD) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { persistSession: true, autoRefreshToken: true },
            db: { schema: 'public' },
        });
        console.log("✅ Supabase Client Initialized.");
    } catch (e) {
        console.error("❌ Failed to init Supabase:", e);
    }
}

const KEYS = {
  USER: 'bravo_current_user',
  USERS_DB: 'bravo_users_db',
  JOBS: 'bravo_jobs',
  REVIEWS: 'bravo_reviews',
  CHATS: 'bravo_chats',
  REQUESTS: 'bravo_requests',
};

const COMMISSION_RATE = 0.05;

// --- Mock Data Fallback ---
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
];

// --- HELPER FOR DB ACCESS ---

async function fetchTable<T>(tableName: string, localKey: string): Promise<T[]> {
    if (ENABLE_CLOUD && supabase) {
        try {
            const { data, error } = await supabase.from(tableName).select('*').limit(100);
            
            if (error) {
                if (error.code === '42P01') {
                    console.error(`🚨 TABELLA MANCANTE: ${tableName}. Esegui SQL su Supabase!`);
                } else {
                    console.error(`🔥 SUPABASE READ ERROR [${tableName}]:`, error.message);
                }
                return [];
            }
            return data.map((row: any) => row.payload) as T[];
        } catch (e) {
            console.error(`Exception fetching ${tableName}:`, e);
            return [];
        }
    } else {
        return JSON.parse(localStorage.getItem(localKey) || '[]');
    }
}

async function saveItem<T extends { id?: string, email?: string }>(tableName: string, localKey: string, item: T, idField: keyof T = 'id'): Promise<{ success: boolean; error?: string }> {
    if (ENABLE_CLOUD && supabase) {
        try {
            const id = (item as any)[idField];
            if (!id) {
                console.error("Cannot save item without ID");
                return { success: false, error: 'Missing ID' };
            }

            console.log(`☁️ Saving to ${tableName}:`, item);
            
            // Try UPSERT which is more robust
            const { error } = await supabase.from(tableName).upsert({ [idField]: id, payload: item }, { onConflict: idField });
            
            if (error) {
                console.error(`🔥 SUPABASE WRITE ERROR [${tableName}]:`, error.message, error.code, error.details);
                
                if (error.code === '42501') return { success: false, error: 'PERMISSIONS_DENIED' }; // RLS Error
                if (error.code === '42P01') return { success: false, error: 'TABLE_MISSING' };
                if (error.code === '23505') return { success: false, error: 'DUPLICATE' }; // Unique violation
                
                return { success: false, error: error.message };
            }
            return { success: true };
        } catch (e) {
            console.error(`Exception saving to ${tableName}:`, e);
            return { success: false, error: 'EXCEPTION' };
        }
    }
    
    // Local Storage Fallback
    const list = JSON.parse(localStorage.getItem(localKey) || '[]');
    const idx = list.findIndex((x: any) => (x as any)[idField] === (item as any)[idField]);
    if (idx > -1) list[idx] = item;
    else list.push(item);
    localStorage.setItem(localKey, JSON.stringify(list));
    return { success: true };
}

// --- USERS ---

export const getAllRegisteredUsers = async (): Promise<User[]> => {
    return await fetchTable<User>('bravo_users', KEYS.USERS_DB);
}

export const registerUser = async (user: User): Promise<{ success: boolean; msg?: string }> => {
    if (ENABLE_CLOUD && supabase) {
        // Check if user exists
        const { data, error } = await supabase.from('bravo_users').select('email').eq('email', user.email).maybeSingle();
        
        if (error) {
            if (error.code === '42P01') return { success: false, msg: 'TABLE_MISSING' };
            // Ignore other read errors during registration check
        }

        if (data) {
            return { success: false, msg: 'EXISTS' };
        }
    } else {
        const users = await getAllRegisteredUsers();
        if (users.find(u => u.email === user.email)) {
             return { success: false, msg: 'EXISTS' };
        }
    }

    user.verificationStatus = 'none';
    user.isVerified = false;
    user.walletBalance = 0;

    const res = await saveItem('bravo_users', KEYS.USERS_DB, user, 'email');
    if (!res.success) {
        if (res.error === 'PERMISSIONS_DENIED') return { success: false, msg: 'RLS_ERROR' };
        if (res.error === 'TABLE_MISSING') return { success: false, msg: 'TABLE_MISSING' };
        return { success: false, msg: `DB_ERROR: ${res.error}` };
    }
    return { success: true };
}

export const loginUserByEmail = async (email: string): Promise<User | null> => {
    if (ENABLE_CLOUD && supabase) {
        const { data, error } = await supabase.from('bravo_users').select('*').eq('email', email).maybeSingle();
        if (error) console.error("Login Error:", error.message);
        if (!data) return null;
        return data.payload as User;
    }
    const users = await getAllRegisteredUsers();
    return users.find(u => u.email === email) || null;
}

export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(KEYS.USER);
    return stored ? JSON.parse(stored) : null;
};

export const saveCurrentUser = async (user: User) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    // Also update in cloud to keep profile fresh
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

    if (registeredPros.length === 0 && !ENABLE_CLOUD) return SAMPLE_POSTS;
    if (registeredPros.length === 0) return []; 

    const realPosts: Post[] = await Promise.all(registeredPros.map(async pro => {
        const stats = await getReviewStats(pro.name);
        return {
            id: pro.email,
            category: pro.bio.includes('Idraulico') ? 'Idraulico' : 
                      pro.bio.includes('Elettricista') ? 'Elettricista' : 'Tuttofare',
            title: pro.bio || 'Professionista Disponibile',
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

    return realPosts;
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
    const reviewWithPro = { ...review, professionalName: proName };
    await saveItem('bravo_reviews', KEYS.REVIEWS, reviewWithPro);
};

export const addReviewResponse = async (proName: string, reviewId: string, responseText: string) => {
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
    return await saveItem('bravo_jobs', KEYS.JOBS, job);
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

                const users = await getAllRegisteredUsers();
                const pro = users.find(u => u.name === job.professionalName);
                if (pro) {
                    pro.walletBalance = (pro.walletBalance || 0) + proEarning;
                    await saveItem('bravo_users', KEYS.USERS_DB, pro, 'email');
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
    const data = await fetchTable<JobRequest>('bravo_requests', KEYS.REQUESTS);
    return data.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const saveRequest = async (req: JobRequest): Promise<{success: boolean, error?: string}> => {
    console.log("🚀 Saving Request to Cloud:", req);
    const res = await saveItem('bravo_requests', KEYS.REQUESTS, req);
    return res;
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
    localStorage.clear();
    window.location.reload();
}

export const isCloudConnected = () => ENABLE_CLOUD;
 
