
import React, { useState, useEffect } from 'react';
import { User, Review, Job, Post } from '../types';
import { addReview, canReview, markJobAsReviewed, addReviewResponse, getReviewStats, getPosts, getJobs } from '../services/storage';
import { Star, MapPin, ChevronLeft, MessageCircle, Clock, CheckCircle, Briefcase, BadgeCheck, X } from 'lucide-react';

interface ProProfileProps {
  proName: string;
  currentUser: User;
  onBack: () => void;
  onStartChat: (proName: string, avatar: string) => void;
}

export const ProProfile: React.FC<ProProfileProps> = ({ proName, currentUser, onBack, onStartChat }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState({ rating: 0, count: 0 });
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [proJobs, setProJobs] = useState<Job[]>([]);
  const [proPost, setProPost] = useState<Post | null>(null);
  const [proPortfolio, setProPortfolio] = useState<Post[]>([]);
  
  // Modals State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Review Form State
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    checkReviewPermission();
  }, [proName]);

  const loadData = async () => {
    const s = await getReviewStats(proName);
    setStats({ rating: s.rating, count: s.count });
    setReviews(s.reviews);
    
    const allJobs = await getJobs();
    const myJobs = allJobs.filter(j => j.professionalName === proName).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setProJobs(myJobs);

    const allPosts = await getPosts();
    const p = allPosts.find(p => p.professional.name === proName);
    setProPost(p || null);

    const portfolio = allPosts.filter(p => p.professional.name === proName);
    setProPortfolio(portfolio);
  };

  const checkReviewPermission = async () => {
    const can = await canReview(currentUser.name, proName);
    setCanWriteReview(can);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (reviewText.trim().length < 50) {
      setSubmitError('La recensione deve contenere almeno 50 caratteri.');
      return;
    }

    const newReview: Review = {
      id: Date.now().toString(),
      clientName: currentUser.name,
      rating,
      text: reviewText,
      date: new Date().toLocaleDateString('it-IT')
    };

    await addReview(proName, newReview);
    await markJobAsReviewed(currentUser.name, proName);
    
    loadData();
    setCanWriteReview(false);
    setReviewText('');
    setSubmitSuccess('Recensione inviata. Grazie!');
  };

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyText[reviewId];
    if (!text?.trim()) return;
    await addReviewResponse(proName, reviewId, text);
    loadData();
    setReplyText(prev => ({ ...prev, [reviewId]: '' }));
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const isOwner = currentUser.role === 'professionista' && currentUser.name === proName;
  
  // Derived from async state or fallback
  const proAvatar = proPost?.professional.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(proName)}`;
  const proCity = proPost?.professional.city || 'Italia';
  const proResponseTime = proPost?.professional.responseTime || 'Entro poche ore';
  const isVerified = proPost?.professional.isVerified || false;

  return (
    <div className="bg-white min-h-full pb-20 animate-fade-in relative">
      
      {/* Lightbox for Images */}
      {selectedImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
              <button className="absolute top-4 right-4 text-white p-2" onClick={() => setSelectedImage(null)}><X /></button>
              <img src={selectedImage} className="max-w-full max-h-full rounded-lg" />
          </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedJob(null)}>
              <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <button className="absolute top-4 right-4 text-gray-400" onClick={() => setSelectedJob(null)}><X className="w-5 h-5"/></button>
                  <h3 className="text-xl font-bold mb-1">Dettagli Lavoro</h3>
                  <p className="text-gray-500 text-sm mb-4">Lavoro per {selectedJob.clientName}</p>
                  
                  <div className="space-y-3">
                      <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
                          <span className="text-gray-500 text-sm">Data</span>
                          <span className="font-bold text-gray-900 text-sm">{new Date(selectedJob.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
                          <span className="text-gray-500 text-sm">Stato</span>
                          <span className={`font-bold text-sm ${selectedJob.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                              {selectedJob.status === 'completed' ? 'Completato' : 'In Corso'}
                          </span>
                      </div>
                      {selectedJob.completedAt && (
                          <div className="bg-gray-50 p-3 rounded-lg flex justify-between">
                            <span className="text-gray-500 text-sm">Terminato il</span>
                            <span className="font-bold text-gray-900 text-sm">{new Date(selectedJob.completedAt).toLocaleDateString()}</span>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100 p-4 flex items-center justify-between">
        <div className="flex items-center">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <span className="font-bold text-lg ml-2 text-gray-900 truncate max-w-[200px] flex items-center gap-1">
                {proName}
                {isVerified && <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-50" />}
            </span>
        </div>
      </div>

      <div className="p-4">
        {/* Profile Info */}
        <div className="flex flex-col items-center mb-6">
          <img 
            src={proAvatar} 
            alt={proName} 
            className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white mb-3"
          />
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            {proName}
            {isVerified && <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-50" />}
          </h1>
          
          <div className="flex flex-wrap justify-center gap-3 mt-3 text-sm">
             <div className="flex items-center text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                <span className="font-bold text-gray-900 mr-1">{stats.rating}</span>
                <span className="text-gray-500">({stats.count})</span>
             </div>
             <div className="flex items-center text-gray-700 bg-gray-50 px-3 py-1 rounded-full">
                <MapPin className="w-4 h-4 mr-1 text-gray-500" />
                <span>{proCity}</span>
             </div>
          </div>

           <div className="flex items-center text-green-700 bg-green-50 px-3 py-1 rounded-full font-medium mt-2 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                <span>Risponde: {proResponseTime}</span>
             </div>
          
          <div className="mt-6 flex w-full gap-3">
             <button 
                onClick={() => onStartChat(proName, proAvatar)}
                className="flex-1 bg-gray-900 text-white font-semibold py-3 px-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
             >
               <MessageCircle className="w-5 h-5" />
               Contatta
             </button>
          </div>
        </div>

        <hr className="border-gray-100 my-6" />

        {/* Showcase / Vetrina */}
        <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-600" />
                Vetrina & Storico
            </h2>

            {proPortfolio.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                {proPortfolio.map(post => (
                    <div 
                        key={post.id} 
                        onClick={() => setSelectedImage(post.image)}
                        className="aspect-square bg-gray-100 rounded-xl overflow-hidden shadow-sm relative group cursor-pointer"
                    >
                        <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                ))}
                </div>
            )}
            
            {proJobs.length > 0 ? (
                <div className="space-y-3">
                    {proJobs.map(job => {
                        const relatedReview = reviews.find(r => r.clientName === job.clientName); 
                        const isCompleted = job.status === 'completed';

                        return (
                            <div 
                                key={job.id} 
                                onClick={() => setSelectedJob(job)}
                                className="bg-gray-50 p-3 rounded-lg border border-gray-100 active:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-bold text-gray-800">Lavoro per {job.clientName}</span>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                        {isCompleted ? 'Completato' : 'In Corso'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-400 mb-2">{new Date(job.createdAt).toLocaleDateString()}</div>
                                
                                {isCompleted && relatedReview && (
                                    <div className="bg-white p-2 rounded border border-gray-200 mt-2">
                                        <div className="flex items-center gap-1 mb-1">
                                            {[...Array(relatedReview.rating)].map((_, i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />)}
                                        </div>
                                        <p className="text-xs text-gray-600 italic line-clamp-2">"{relatedReview.text}"</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-gray-500 text-sm italic">Nessun lavoro registrato in piattaforma.</p>
            )}
        </div>

        <hr className="border-gray-100 my-6" />

        {/* Reviews Section */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
            Recensioni
            <span className="text-sm font-normal text-gray-500">{stats.count} totali</span>
          </h2>

          {canWriteReview && (
            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm mb-6 ring-4 ring-blue-50/50">
              <h3 className="font-bold text-gray-900 mb-3">Lascia una recensione</h3>
              <form onSubmit={handleSubmitReview}>
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`} 
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  placeholder="Racconta la tua esperienza (minimo 50 caratteri)..."
                  className="w-full p-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  rows={3}
                />
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-xs font-bold ${reviewText.length < 50 ? 'text-red-500' : 'text-green-500'}`}>
                        {reviewText.length} / 50 min
                    </span>
                    {submitError && <p className="text-red-500 text-xs font-medium">{submitError}</p>}
                </div>
                <button 
                  type="submit" 
                  disabled={reviewText.length < 50}
                  className={`text-white text-sm font-bold py-2 px-6 rounded-lg shadow-md transition-colors ${
                      reviewText.length < 50 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Invia
                </button>
              </form>
            </div>
          )}
          
          {submitSuccess && (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl mb-4 text-sm font-bold border border-green-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {submitSuccess}
            </div>
          )}

          <div className="space-y-4">
            {displayedReviews.length === 0 && (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <p className="text-gray-500 text-sm">Ancora nessuna recensione.</p>
              </div>
            )}

            {displayedReviews.map(review => (
              <div key={review.id} className="bg-gray-50 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-gray-900">{review.clientName}</div>
                  <span className="text-xs text-gray-400 font-medium">{review.date}</span>
                </div>
                <div className="flex text-yellow-400 text-xs mb-2">
                  {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                </div>
                <p className="text-gray-800 text-sm leading-relaxed font-medium">{review.text}</p>
                {review.jobTitle && (
                    <span className="inline-block mt-2 text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        Lavoro: {review.jobTitle}
                    </span>
                )}
                {review.response && (
                  <div className="mt-3 ml-2 pl-3 border-l-2 border-gray-300">
                    <p className="text-xs font-bold text-gray-900 mb-1">Risposta:</p>
                    <p className="text-xs text-gray-600 italic">"{review.response}"</p>
                  </div>
                )}
                {isOwner && !review.response && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={replyText[review.id] || ''}
                        onChange={(e) => setReplyText(prev => ({...prev, [review.id]: e.target.value}))}
                        placeholder="Rispondi..."
                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-blue-500"
                      />
                      <button 
                        onClick={() => handleReplySubmit(review.id)}
                        className="bg-gray-900 text-white px-3 py-1 rounded text-xs font-bold"
                      >
                        Invia
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {reviews.length > 3 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="w-full mt-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              {showAllReviews ? 'Mostra meno' : `Leggi tutte le recensioni (${stats.count})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
