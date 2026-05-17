import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Filter, MessageSquare } from 'lucide-react'
import { getReviews, replyToReview } from '../services/dataService'

function StarRating({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-600'} />
      ))}
    </div>
  )
}

export function ReviewsPage() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterRating, setFilterRating] = useState(0)
  const [sortBy, setSortBy] = useState('newest')
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')

  const refresh = () => getReviews().then(setReviews)

  useEffect(() => { refresh().finally(() => setLoading(false)) }, [])

  const filtered = reviews
    .filter(r => filterRating === 0 || r.rating === filterRating)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date) - new Date(a.date)
      if (sortBy === 'oldest') return new Date(a.date) - new Date(b.date)
      if (sortBy === 'highest') return b.rating - a.rating
      if (sortBy === 'lowest') return a.rating - b.rating
      return 0
    })

  const avgRating = reviews.length ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0'
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({ rating: r, count: reviews.filter(rv => rv.rating === r).length }))

  const handleReply = async (id) => {
    if (!replyText.trim()) return
    try {
      await replyToReview(id, replyText)
      refresh()
      setReplyingTo(null)
      setReplyText('')
    } catch (err) {
      console.error('Reply failed:', err)
      alert('Failed to send reply: ' + (err.message || 'Unknown error'))
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Reviews</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Feedback and ratings from your customers</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="text-center md:text-left">
            <p className="text-5xl font-bold text-slate-900 dark:text-white">{avgRating}</p>
            <StarRating rating={Math.round(parseFloat(avgRating))} size={20} />
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{reviews.length} reviews</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {ratingCounts.map(rc => (
              <div key={rc.rating} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 w-8">{rc.rating} ★</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${reviews.length ? (rc.count / reviews.length) * 100 : 0}%` }} />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 w-6 text-right">{rc.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterRating(0)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterRating === 0 ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>All</button>
          {[5, 4, 3, 2, 1].map(r => (
            <button key={r} onClick={() => setFilterRating(r)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterRating === r ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>{r} ★</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select id="reviewsSort" name="reviewsSort" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest rating</option>
            <option value="lowest">Lowest rating</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((r) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 text-sm font-semibold">{r.name.split(' ').map(n => n[0]).join('')}</div>
                <div><p className="font-medium text-slate-900 dark:text-white">{r.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{r.date}</p></div>
              </div>
              <StarRating rating={r.rating} />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{r.text}</p>
            {r.reply && (
              <div className="ml-12 bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border-l-2 border-brand-500">
                <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">Your reply</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{r.reply}</p>
              </div>
            )}
            {!r.reply && replyingTo !== r.id && (
              <button onClick={() => setReplyingTo(r.id)} className="flex items-center gap-1.5 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors"><MessageSquare size={14} /> Reply</button>
            )}
            <AnimatePresence>
              {replyingTo === r.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3">
                  <textarea id="reviewsReply" name="reviewsReply" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write your reply..." rows={2} className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none" />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleReply(r.id)} className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 transition-colors">Send Reply</button>
                    <button onClick={() => { setReplyingTo(null); setReplyText('') }} className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
