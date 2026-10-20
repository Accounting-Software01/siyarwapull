'use client'

import { Fragment, Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Flame, TrendingUp, Zap, Plus, RefreshCw, Bell, Sparkles, Users, Home, Compass
} from 'lucide-react'
import Link from 'next/link'
import ThreeCurveFab from '@/components/dashboard/layout/three-curve-fab'
import StoryViewer from '@/components/dashboard/stories/story-viewer'
import type { ForgeFeed, NewsArticle } from '@/lib/dashboard/types'
import { TRENDING } from '@/lib/dashboard/constants'
import StoriesStrip from '@/components/dashboard/layout/stories-strip'
import SuggestedAllies from '@/components/dashboard/layout/suggested-allies'
import Sidebar from '@/components/dashboard/layout/sidebar'
import EmptyFeed from '@/components/dashboard/layout/empty-feed'
import NewsCard from '@/components/dashboard/cards/news-card'
import ForgeCard from '@/components/dashboard/cards/forge-card'
import FeedCard from '@/components/dashboard/cards/feed-card'
import CardSkeleton from '@/components/dashboard/cards/card-skeleton'
import CommentPanel from '@/components/dashboard/comments/comment-panel'
import ArticleReader from '@/components/dashboard/news/ArticleReader'
import { useAuthGate } from '@/contexts/AuthGateContext'

// Helper for time ago
function timeAgo(date: string | Date): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return past.toLocaleDateString()
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  )
}

function DashboardPageInner() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { requireAuth } = useAuthGate()

  // ── State ──────────────────────────────────────────────────────────
  const [feedItems, setFeedItems] = useState<ForgeFeed[]>([])
  const [newsItems, setNewsItems] = useState<NewsArticle[]>([])
  const [followingFeedPosts, setFollowingFeedPosts] = useState<any[]>([])
  const [suggestedUsers, setSuggested] = useState<any[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [followedProfiles, setFollowedProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)
  const [followingFeedLoading, setFollowingFeedLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [likedForges, setLikedForges] = useState<Set<string>>(new Set())
  const [likedNews, setLikedNews] = useState<Set<string>>(new Set())
  const [likedFollowingFeed, setLikedFollowingFeed] = useState<Set<string>>(new Set())
  const [newsCC, setNewsCC] = useState<Record<string, number>>({})
  const [forgeCC, setForgeCC] = useState<Record<string, number>>({})
  const [followingFeedCC, setFollowingFeedCC] = useState<Record<string, number>>({})
  const [shareCopied, setShareCopied] = useState<string | null>(null)
  const [showAllNews, setShowAllNews] = useState(false)
  const activeTab: 'forYou' | 'following' = searchParams.get('tab') === 'following' ? 'following' : 'forYou'
  const [commentPanel, setCommentPanel] = useState<{ articleId?: string; forgeId?: string; feedId?: string } | null>(null)
  const [viewingStoryUserId, setViewingStoryUserId] = useState<string | null>(null)
  
  // ── State for Auto-Refresh & Infinite Scroll ───────────────────────────
  const [displayedNews, setDisplayedNews] = useState<NewsArticle[]>([])
  const [newsPage, setNewsPage] = useState(1)
  const [hasMoreNews, setHasMoreNews] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [currentArticleIndex, setCurrentArticleIndex] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [showRefreshToast, setShowRefreshToast] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // ✅ FIX: Use ref for subscription instead of state
  const subscriptionRef = useRef<any>(null)

  // ── Load Following Feed Posts ──────────────────────────────────────────
  const loadFollowingFeedPosts = useCallback(async () => {
    if (!user) return
    setFollowingFeedLoading(true)
    try {
      const followingIds = Array.from(following)
      const allUserIds = [...followingIds, user.id]
      
      if (allUserIds.length === 0) {
        setFollowingFeedPosts([])
        setFollowingFeedLoading(false)
        return
      }
      
      const { data: posts, error } = await supabase
        .from('user_feeds')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .in('user_id', allUserIds)
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      
      const postsWithProfiles = (posts || []).map(post => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      }))
      
      setFollowingFeedPosts(postsWithProfiles)
      
      if (user && postsWithProfiles.length) {
        const postIds = postsWithProfiles.map(p => p.id)
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds)
        
        setLikedFollowingFeed(new Set(likes?.map(l => l.post_id) || []))
        
        const { data: comments } = await supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds)
        
        const cc: Record<string, number> = {}
        comments?.forEach((c: any) => { cc[c.post_id] = (cc[c.post_id] || 0) + 1 })
        setFollowingFeedCC(cc)
      }
      
    } catch (error) {
      console.error('Error loading following feed posts:', error)
    } finally {
      setFollowingFeedLoading(false)
    }
  }, [supabase, user, following])

  // ── Load News ──────────────────────────────────────────────────────────
  const loadNews = useCallback(async (currentUser: any, forceRefresh = false) => {
    setNewsLoading(true)
    try {
      const bustParam = forceRefresh ? `?bust=${Date.now()}` : ''
      const res = await fetch(`/api/news${bustParam}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      
      const articles: NewsArticle[] = (data.articles || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description || '',
        url: a.url,
        urlToImage: a.urlToImage || null,
        source: a.source || { name: 'News' },
        publishedAt: a.publishedAt,
      }))
      
      setNewsItems(articles)
      setLastUpdated(new Date())

      if (currentUser && articles.length) {
        const ids = articles.map(a => a.id)
        const [{ data: likes }, { data: cmts }] = await Promise.all([
          supabase.from('news_likes').select('article_id').eq('user_id', currentUser.id).in('article_id', ids),
          supabase.from('news_comments').select('article_id').in('article_id', ids),
        ])
        setLikedNews(new Set((likes || []).map((l: any) => l.article_id)))
        const cc: Record<string, number> = {}
        ;(cmts || []).forEach((c: any) => { cc[c.article_id] = (cc[c.article_id] || 0) + 1 })
        setNewsCC(cc)
      }
    } catch (e) {
      console.error('[News Error]', e)
    } finally {
      setNewsLoading(false)
    }
  }, [supabase])

  // ── Auto-Refresh News ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        refreshNews()
      }
    }, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshNews()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user])

  const refreshNews = useCallback(async () => {
    if (refreshing || !user) return
    setRefreshing(true)
    try {
      await loadNews(user, true)
      setShowRefreshToast(true)
      setTimeout(() => setShowRefreshToast(false), 2000)
    } catch (error) {
      console.error('Failed to refresh news:', error)
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, user, loadNews])

  // ── Update displayed news ─────────────────────────────────────────────
  useEffect(() => {
    if (newsItems.length > 0) {
      const initialCount = showAllNews ? newsItems.length : Math.min(5, newsItems.length)
      setDisplayedNews(newsItems.slice(0, initialCount))
      setHasMoreNews(!showAllNews && newsItems.length > initialCount)
      setNewsPage(1)
    }
  }, [newsItems, showAllNews])

  // ── Infinite scroll observer ──────────────────────────────────────────────
  useEffect(() => {
    if (showAllNews) return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreNews && !newsLoading && newsItems.length > 0) {
          const nextPage = newsPage + 1
          const itemsToShow = nextPage * 5
          const nextItems = newsItems.slice(0, itemsToShow)
          setDisplayedNews(nextItems)
          setNewsPage(nextPage)
          setHasMoreNews(nextItems.length < newsItems.length)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasMoreNews, newsLoading, newsPage, newsItems, showAllNews])

  // ── Reload following feed when following changes ──────────────────────────
  useEffect(() => {
    if (user) {
      loadFollowingFeedPosts()
    }
  }, [following, user, loadFollowingFeedPosts])

  // ✅ FIXED: REAL-TIME SUBSCRIPTION - Using ref instead of state
  useEffect(() => {
    if (!user) return

    const followingIds = Array.from(following)
    const allUserIds = [...followingIds, user.id]
    
    if (allUserIds.length === 0) return

    // Clean up previous subscription if exists
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    const subscription = supabase
      .channel('user_feeds_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_feeds',
          filter: `user_id=in.(${allUserIds.join(',')})`
        },
        async (payload) => {
          console.log('📝 New post received in real-time:', payload.new)
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single()
          
          const newPost = {
            ...payload.new,
            profiles: profile
          }
          
          setFollowingFeedPosts(prev => [newPost, ...prev])
          setShowRefreshToast(true)
          setTimeout(() => setShowRefreshToast(false), 2000)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_feeds'
        },
        (payload) => {
          console.log('🗑️ Post deleted:', payload.old)
          setFollowingFeedPosts(prev => prev.filter(post => post.id !== payload.old.id))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_feeds'
        },
        (payload) => {
          console.log('✏️ Post updated:', payload.new)
          setFollowingFeedPosts(prev => prev.map(post => 
            post.id === payload.new.id ? { ...post, ...payload.new } : post
          ))
        }
      )
      .subscribe()

    subscriptionRef.current = subscription

    // ✅ FIXED: Proper cleanup without using state
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [user, following, supabase])

  // ── Listen for manual post created events ──
  useEffect(() => {
    const handlePostCreated = (event: any) => {
      console.log('🔄 Manual post refresh triggered', event.detail)
      loadFollowingFeedPosts()
    }
    
    window.addEventListener('postCreated', handlePostCreated)
    return () => window.removeEventListener('postCreated', handlePostCreated)
  }, [loadFollowingFeedPosts])

  // ── Main useEffect for user data loading (guests browse in freely) ────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user: au } } = await supabase.auth.getUser()
        setUser(au ?? null)

        // Public feed content — available to guests and logged-in users alike
        const sel = `id,name,description,template_type,user_id,created_at,is_published,profiles:user_id(id,display_name,username,avatar_url)`
        const { data: forges } = await supabase.from('forges').select(sel).eq('is_published', true).order('created_at', { ascending: false }).limit(30)
        setFeedItems(forges || [])

        // People who have published forges are the most useful to recommend first
        const creatorIds = new Set<string>((forges || []).map((f: any) => f.user_id))
        const rankSuggestions = (list: any[]) =>
          [...list].sort((a, b) => Number(creatorIds.has(b.id)) - Number(creatorIds.has(a.id)))

        if (forges?.length) {
          const { data: fc } = await supabase.from('forge_comments').select('forge_id').in('forge_id', forges.map(f => f.id))
          const cc: Record<string, number> = {}
          ;(fc || []).forEach((c: any) => { cc[c.forge_id] = (cc[c.forge_id] || 0) + 1 })
          setForgeCC(cc)
        }

        if (au) {
          const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', au.id).single()
          if (myProfile) setCurrentUserProfile(myProfile)

          const { data: alliesData } = await supabase.from('allies').select('following_id').eq('follower_id', au.id)
          const followSet = new Set<string>((alliesData || []).map((a: any) => a.following_id))
          setFollowing(followSet)

          const followingIds = Array.from(followSet)
          if (followingIds.length > 0) {
            const { data: fp } = await supabase
              .from('profiles')
              .select('id, display_name, username, avatar_url')
              .in('id', followingIds)
            setFollowedProfiles(fp || [])
          }

          const { data: users } = await supabase.from('profiles').select('id,display_name,username,avatar_url,bio').neq('id', au.id).limit(40)
          setSuggested(
            rankSuggestions((users || []).filter((u: any) => u.username && !followSet.has(u.id))).slice(0, 24)
          )

          const { data: liked } = await supabase.from('interactions').select('forge_id').eq('user_id', au.id).eq('interaction_type', 'like')
          setLikedForges(new Set((liked || []).map((i: any) => i.forge_id)))
        } else {
          // Guest: show a sample of creators to follow once they sign up, skip personalized data
          const { data: users } = await supabase.from('profiles').select('id,display_name,username,avatar_url,bio').limit(40)
          setSuggested(rankSuggestions((users || []).filter((u: any) => u.username)).slice(0, 24))
        }

        await loadNews(au)
        
        setLoading(false)
      } catch (e) {
        console.error('Load error:', e)
        setLoading(false)
      }
    }
    load()
  }, [router, supabase, loadNews])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleFollow = async (userId: string) => {
    if (!requireAuth(user, 'follow this creator')) return
    const prev = following.has(userId)
    setFollowing(s => { const n = new Set(s); prev ? n.delete(userId) : n.add(userId); return n })
    await fetch('/api/allies', {
      method: prev ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ following_id: userId }),
    })
  }

  const handleForgeLike = async (id: string) => {
    if (!requireAuth(user, 'like this forge')) return
    const prev = likedForges.has(id)
    setLikedForges(s => { const n = new Set(s); prev ? n.delete(id) : n.add(id); return n })
    if (prev) await supabase.from('interactions').delete().eq('forge_id', id).eq('user_id', user.id).eq('interaction_type', 'like')
    else await supabase.from('interactions').insert({ forge_id: id, user_id: user.id, interaction_type: 'like' })
  }

  const handleNewsLike = async (id: string) => {
    if (!requireAuth(user, 'like this article')) return
    const prev = likedNews.has(id)
    setLikedNews(s => { const n = new Set(s); prev ? n.delete(id) : n.add(id); return n })
    if (prev) await supabase.from('news_likes').delete().eq('article_id', id).eq('user_id', user.id)
    else await supabase.from('news_likes').insert({ article_id: id, user_id: user.id })
  }

  const handleFollowingFeedLike = async (postId: string) => {
    if (!requireAuth(user, 'like this post')) return
    const isLiked = likedFollowingFeed.has(postId)
    
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id)
      setLikedFollowingFeed(prev => { const n = new Set(prev); n.delete(postId); return n })
      setFollowingFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) - 1 } : p))
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id })
      setLikedFollowingFeed(prev => new Set(prev).add(postId))
      setFollowingFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p))
    }
  }

  const handleShare = (url: string, id: string) => {
    navigator.clipboard.writeText(url).catch(() => {})
    setShareCopied(id)
    setTimeout(() => setShareCopied(null), 2000)
  }

  const handleTagClick = (tag: string) => {
    console.log('Searching for tag:', tag)
  }

  // Article reader navigation
  const handleReadInside = (article: NewsArticle, index: number) => {
    setCurrentArticleIndex(index)
    setSelectedArticle(article)
  }

  const handleNextArticle = () => {
    const currentList = showAllNews ? newsItems : displayedNews
    if (currentArticleIndex < currentList.length - 1) {
      const nextIndex = currentArticleIndex + 1
      setCurrentArticleIndex(nextIndex)
      setSelectedArticle(currentList[nextIndex])
    }
  }

  const handlePreviousArticle = () => {
    const currentList = showAllNews ? newsItems : displayedNews
    if (currentArticleIndex > 0) {
      const prevIndex = currentArticleIndex - 1
      setCurrentArticleIndex(prevIndex)
      setSelectedArticle(currentList[prevIndex])
    }
  }

  // ── Derived View Logic ─────────────────────────────────────────────────────
  const currentNewsList = showAllNews ? newsItems : displayedNews

  const usersWithSelf: any[] = []
  const seen = new Set<string>()

  if (currentUserProfile) {
    usersWithSelf.push(currentUserProfile)
    seen.add(currentUserProfile.id)
  }

  followedProfiles.forEach(p => {
    if (!seen.has(p.id)) {
      usersWithSelf.push(p)
      seen.add(p.id)
    }
  })

  suggestedUsers.forEach(u => {
    if (!seen.has(u.id)) {
      usersWithSelf.push(u)
      seen.add(u.id)
    }
  })

  // ── "People to follow" placement inside the news feed ─────────────────────
  // New users (following fewer than 3 people) see it early, after the 2nd story;
  // everyone else after the 4th. It then repeats every 8 stories with fresh people.
  const isNewUser = following.size < 3
  const firstSuggestAt = isNewUser ? 2 : 4
  const SUGGEST_EVERY = 8
  const SUGGEST_WINDOW = 8
  const suggestionSlot = (idx: number): number => {
    const n = idx + 1
    if (n < firstSuggestAt || (n - firstSuggestAt) % SUGGEST_EVERY !== 0) return -1
    return (n - firstSuggestAt) / SUGGEST_EVERY
  }
  const suggestionsForSlot = (slot: number) => {
    const list = suggestedUsers.slice(slot * SUGGEST_WINDOW, slot * SUGGEST_WINDOW + SUGGEST_WINDOW)
    return slot > 0 && list.length < 3 ? [] : list
  }

  // ── Loading Skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen p-8">
        <div className="max-w-4xl mx-auto space-y-6">
           <Skeleton className="h-48 w-full rounded-3xl" />
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24 pt-[100px] lg:pt-[108px]">
      <StoriesStrip
        users={usersWithSelf}           
        currentUserId={user?.id || null}
        onOpenStory={setViewingStoryUserId}
      />

      
        <main className="mx-auto grid w-full min-w-0 max-w-md grid-cols-1 gap-6 overflow-x-hidden px-5 py-4 lg:max-w-5xl lg:grid-cols-3">
        
          <div className="min-w-0 w-full max-w-full space-y-8 lg:col-span-2">
          
          {/* ── TAB 1: FOR YOU (NEWS ONLY) ─────────────────────────────────── */}
          {activeTab === 'forYou' && (
            <>
              {/* Trending Tags Section */}
              <div className="overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-3.5 w-3.5 text-black" />
                  <span className="text-[11px] font-extrabold text-gray-500 uppercase tracking-widest">Trending Now</span>
                </div>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                  {TRENDING.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => handleTagClick(tag)}
                      className="flex-shrink-0 text-xs font-bold px-4 py-2.5 rounded-full bg-white border border-gray-300 text-black whitespace-nowrap active:bg-gray-100 transition"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* News Feed Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-black" />
                    <h2 className="text-sm font-extrabold text-black uppercase tracking-tight">Top Stories</h2>
                    {lastUpdated && (
                      <span className="text-[10px] text-gray-400 ml-2">
                        Updated {timeAgo(lastUpdated)} ago
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={refreshNews}
                      disabled={refreshing}
                      className={`p-1.5 rounded-full transition ${
                        refreshing ? 'animate-spin text-black' : 'text-gray-500 hover:text-black hover:bg-gray-100'
                      }`}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button onClick={() => setShowAllNews(!showAllNews)} className="text-xs font-bold text-black underline underline-offset-2">
                      {showAllNews ? 'Show Less' : 'See All'}
                    </button>
                  </div>
                </div>

                <div className="space-y-5">
                  {currentNewsList.map((article, idx) => {
                    const slot = suggestionSlot(idx)
                    const people = slot >= 0 ? suggestionsForSlot(slot) : []
                    return (
                      <Fragment key={article.id}>
                        <NewsCard
                          article={article}
                          isLiked={likedNews.has(article.id)}
                          commentCount={newsCC[article.id] || 0}
                          shareCopied={shareCopied === article.id}
                          onLike={() => handleNewsLike(article.id)}
                          onComment={() => setCommentPanel({ articleId: article.id })}
                          onShare={() => handleShare(article.url, article.id)}
                          onReadInside={() => handleReadInside(article, idx)}
                        />
                        {people.length > 0 && (
                          <SuggestedAllies
                            users={people}
                            followingSet={following}
                            onFollow={handleFollow}
                            subtitle={
                              slot === 0 && isNewUser
                                ? 'Follow a few creators and your feed starts to feel like yours.'
                                : 'More creators you might like.'
                            }
                          />
                        )}
                      </Fragment>
                    )
                  })}
                  
                  {/* Infinite scroll observer */}
                  {!showAllNews && hasMoreNews && !newsLoading && newsItems.length > 0 && (
                    <div ref={observerTarget} className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  
                  {newsLoading && (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-3 border-gray-200 border-t-black rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          {/* ── TAB 2: FOLLOWING (FEED POSTS FROM FOLLOWED USERS + YOUR POSTS) ── */}
          {activeTab === 'following' && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-black" />
                <h2 className="text-sm font-extrabold text-black uppercase tracking-tight">Following Feed</h2>
              </div>
              
              {followingFeedPosts.length === 0 && !followingFeedLoading ? (
                <div className="space-y-5">
                  <EmptyFeed
                    title="No posts from people you follow"
                    description="When you or people you follow share posts, they'll appear here"
                  />
                  <SuggestedAllies
                    users={suggestedUsers.slice(0, 12)}
                    followingSet={following}
                    onFollow={handleFollow}
                    title="Find people to follow"
                    subtitle="Follow a few and their posts will show up here."
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {followingFeedPosts.map((post) => (
                    <FeedCard
                      key={post.id}
                      post={post}
                      isFollowing={following.has(post.user_id)}
                      isLiked={likedFollowingFeed.has(post.id)}
                      currentUserId={user?.id || ''}
                      commentCount={followingFeedCC[post.id] || 0}
                      onFollow={() => handleFollow(post.user_id)}
                      onLike={() => handleFollowingFeedLike(post.id)}
                      onComment={() => setCommentPanel({ feedId: post.id })}
                      onShare={() => handleShare(`/post/${post.id}`, post.id)}
                      onTagClick={handleTagClick}
                    />
                  ))}
                  
                  {followingFeedLoading && (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-3 border-gray-200 border-t-black rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-[108px]">
            <Sidebar
              suggestedUsers={suggestedUsers}
              followingSet={following}
              onFollow={handleFollow}
            />
          </div>
        </aside>
      </main>

      {/* FAB */}
      <ThreeCurveFab />

      {commentPanel && (
        <div className="fixed inset-0 z-[60]">
          <CommentPanel
            articleId={commentPanel.articleId}
            forgeId={commentPanel.forgeId}
            feedId={commentPanel.feedId}
            currentUser={user}
            onClose={() => setCommentPanel(null)}
          />
        </div>
      )}

      {viewingStoryUserId && (
        <StoryViewer userId={viewingStoryUserId} onClose={() => setViewingStoryUserId(null)} />
      )}

      {/* Article Reader Modal */}
      {selectedArticle && (
        <ArticleReader
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onNext={handleNextArticle}
          onPrevious={handlePreviousArticle}
          hasNext={currentArticleIndex < (showAllNews ? newsItems.length : displayedNews.length) - 1}
          hasPrevious={currentArticleIndex > 0}
          isLiked={likedNews.has(selectedArticle.id)}
          commentCount={newsCC[selectedArticle.id] || 0}
          onLike={() => handleNewsLike(selectedArticle.id)}
          onComment={() => setCommentPanel({ articleId: selectedArticle.id })}
        />
      )}

      {/* Refresh Toast Notification */}
      {showRefreshToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-lg">
            <RefreshCw className="h-4 w-4" />
            New content available!
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
