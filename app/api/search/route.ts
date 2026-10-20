import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim() ?? ''
  const type = searchParams.get('type') ?? 'all'

  if (!query) {
    return NextResponse.json({
      people: [],
      news: [],
      forges: [],
      projects: [],
      groups: [],
    })
  }

  const supabase = await createClient()
  const like = `%${query}%`
  const want = (t: string) => type === 'all' || type === t

  try {
    const [peopleRes, forgesRes, postsRes, newsRes] = await Promise.all([
      /* ---- People ---- */
      want('people')
        ? supabase
            .from('profiles')
            .select(
              'id, username, display_name, avatar_url, bio, follower_count, forge_count, is_verified, is_official'
            )
            .or(
              `username.ilike.${like},display_name.ilike.${like},bio.ilike.${like}`
            )
            .limit(20)
        : Promise.resolve({ data: [], error: null }),

      /* ---- Forges (published only) ---- */
      want('forges')
        ? supabase
            .from('forges')
            .select(
              'id, name, description, template_type, user_id, created_at, config, profiles:user_id(id, username, display_name, avatar_url)'
            )
            .eq('is_published', true)
            .or(`name.ilike.${like},description.ilike.${like}`)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),

      /* ---- Posts (user_feeds) ---- */
      want('projects') || type === 'all'
        ? supabase
            .from('user_feeds')
            .select(
              'id, title, content, media_url, media_type, user_id, created_at, profiles:user_id(id, username, display_name, avatar_url)'
            )
            .or(`title.ilike.${like},content.ilike.${like}`)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),

      /* ---- News ---- */
      want('news')
        ? supabase
            .from('news_articles')
            .select(
              'id, title, description, url, image_url, source_name, published_at'
            )
            .or(`title.ilike.${like},description.ilike.${like}`)
            .order('published_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [], error: null }),
    ])

    /* Flatten nested profiles so the search page can read creator info directly */
    const forges = (forgesRes.data ?? []).map((f: any) => {
      const owner = Array.isArray(f.profiles) ? f.profiles[0] : f.profiles
      return {
        id: f.id,
        name: f.name,
        title: f.name,
        description: f.description,
        template_type: f.template_type,
        user_id: f.user_id,
        display_name: owner?.display_name ?? null,
        creator_username: owner?.username ?? null,
        avatar_url: owner?.avatar_url ?? null,
        image_url:
          f.config?.cover_image ||
          f.config?.image_url ||
          f.config?.thumbnail_url ||
          (Array.isArray(f.config?.images) ? f.config.images[0] : null) ||
          null,
        created_at: f.created_at,
      }
    })

    const projects = (postsRes.data ?? []).map((p: any) => {
      const owner = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
      return {
        id: p.id,
        title: p.title,
        description: p.content,
        excerpt: p.content,
        image_url: p.media_type === 'image' ? p.media_url : null,
        display_name: owner?.display_name ?? null,
        creator_username: owner?.username ?? null,
        avatar_url: owner?.avatar_url ?? null,
        created_at: p.created_at,
      }
    })

    const news = (newsRes.data ?? []).map((n: any) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      excerpt: n.description,
      url: n.url,
      image_url: n.image_url,
      source: n.source_name,
      created_at: n.published_at,
    }))

    return NextResponse.json({
      people: peopleRes.data ?? [],
      profiles: peopleRes.data ?? [], // keep old key for backwards-compat
      forges,
      projects,
      news,
      groups: [],
      query,
    })
  } catch (error) {
    console.error('[search] error:', error)
    return NextResponse.json(
      {
        error: 'Search failed',
        people: [],
        profiles: [],
        forges: [],
        projects: [],
        news: [],
        groups: [],
      },
      { status: 500 }
    )
  }
}
