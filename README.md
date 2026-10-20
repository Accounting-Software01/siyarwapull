# Pull

Build differently.

## What is Pull?

Pull is a mobile-first creative platform where people build, discover, and share across multiple content formats — short videos, written posts, visual galleries, shops, and more. Every creator gets a persistent space; every piece of content can become a discovery pathway.

The name says it: **pull** things into your world — creators, ideas, projects, allies.

### What Makes Pull Different

- **One Face, many formats.** Your identity isn't tied to a single feed. Post videos, write articles, publish galleries, run a shop — all under one handle.
- **Forge-based creation.** Every piece of content lives inside a "Forge" — a self-contained mini-app you control.
- **Discover by topic, not by algorithm alone.** Real topics, real people, real signals.
- **Native mobile feel.** Built mobile-first. Fast on budget Android.

## Core Features

### Feed
Your home timeline. Mix of News (external), Forges (from your network), and Posts. Tabs for "For You" and "Following". Real-time updates when allies post.

### Discover
Two tabs — **Topics** and **Trending #**. Topic tiles are populated by real creators whose Forges or Posts match the topic. Tap any tile to search for content in that topic.

### News
Curated articles from global sources. Like, save, comment, and read in an in-app reader. Auto-refreshes every few minutes.

### Clips
Short-form vertical video. Like, comment, share, save — same pattern as the video platforms you already use, but woven into Pull's identity and topic graph.

### Forges
Mini-apps you build and publish. 7 templates:

| Template | Purpose | Supports |
|----------|---------|----------|
| **Portfolio** | Showcase work | External link or uploaded ZIP |
| **Blog** | Long-form writing | Markdown, categories |
| **Gallery** | Visual collections | **Image uploads**, **PDF/book uploads** |
| **Shop** | Sell products/services | Physical products, **digital products (PDFs)** |
| **Donation** | Fundraising | Target, milestones, beneficiary |
| **Game** | Playable experiences | HTML/CSS/JS ZIP |
| **Custom** | Advanced projects | Any runtime, env vars, exposed ports |

### Search
Full-text search across People, News, Forges, Projects, and Groups. Filter chips for each type. Recent searches saved locally.

### Messages
Direct conversations and notifications.

### Profile
Your public identity. All your published Forges, Posts, and Clips in one place.

## Architecture

### Database Schema (Supabase PostgreSQL)

**Identity**
- `profiles` — User identity, bio, avatar, stats, verification flags
- `allies` — Follow/follower relationships ("Allies" = who you follow)
- `builders` — Collaborators on Forges

**Content**
- `forges` — Mini-apps with config, template type, publish state
- `forge_assets` — Uploaded files (images, PDFs) tied to a Forge
- `forge_comments` — Comments on Forges
- `forge_contributors` — Who works on which Forge
- `user_feeds` — Posts: text, media, tags[], feeling, location, engagement counts
- `post_likes`, `post_comments` — Engagement on Posts
- `clips` — Short vertical videos
- `news_articles` — Cached external news
- `news_likes`, `news_saves`, `news_comments` — Engagement on News

## Siyarwa Pull Marketplace
Siyarwa Pull includes an integrated marketplace at `/market` (Paystack payments, Supabase). Setup and go-live steps: see `MARKET_SETUP.md`. Copy `.env.example` to `.env.local` to configure.

## Unified feed
The dashboard "For You" tab is the centre of the app: it mixes news, Forges, posts, clips and marketplace products in one feed. Tapping a product opens its page (`/market/<id>`) where the buyer can pay with Paystack. Each source loads independently, so if one is unavailable the rest still appear.
