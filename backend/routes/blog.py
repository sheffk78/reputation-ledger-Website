"""
Blog routes for RepLedger.

Admin routes (require admin auth):
  POST   /api/admin/blog/posts           — Create post (draft)
  GET    /api/admin/blog/posts           — List all posts (drafts + published)
  GET    /api/admin/blog/posts/:id       — Get post by ID
  PATCH  /api/admin/blog/posts/:id       — Update post
  DELETE /api/admin/blog/posts/:id       — Delete post
  POST   /api/admin/blog/posts/:id/publish — Publish a draft

Public routes (no auth):
  GET    /api/blog/posts                 — List published posts
  GET    /api/blog/posts/:slug           — Get published post by slug
  GET    /api/blog/rss                   — RSS feed
"""
import re
import uuid
import math
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from typing import Optional
from html import escape

from core.database import db
from core.dependencies import get_admin_user
from core.exceptions import APIError, ErrorCodes
from models.blog import (
    BlogPostCreate, BlogPostUpdate, BlogPostResponse,
    BlogPostPublicResponse, BlogPostListItem, BlogPostListResponse,
)

logger = logging.getLogger(__name__)

# Admin routes
admin_router = APIRouter(prefix="/admin/blog", tags=["admin-blog"])

# Public routes
public_router = APIRouter(prefix="/blog", tags=["blog"])

BASE_URL = "https://reputationledger.dev"


# ============== HELPERS ==============

def slugify(title: str) -> str:
    """Convert title to URL-safe slug."""
    slug = title.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def generate_excerpt(content: str, max_length: int = 200) -> str:
    """Generate excerpt from markdown content."""
    # Strip markdown formatting
    text = re.sub(r'#+ ', '', content)  # headers
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # bold
    text = re.sub(r'\*(.+?)\*', r'\1', text)  # italic
    text = re.sub(r'\[(.+?)\]\(.+?\)', r'\1', text)  # links
    text = re.sub(r'```[\s\S]*?```', '', text)  # code blocks
    text = re.sub(r'`(.+?)`', r'\1', text)  # inline code
    text = re.sub(r'\n+', ' ', text).strip()
    
    if len(text) <= max_length:
        return text
    return text[:max_length].rsplit(' ', 1)[0] + '...'


def count_words(content: str) -> int:
    """Count words in markdown content."""
    text = re.sub(r'```[\s\S]*?```', '', content)  # Remove code blocks
    text = re.sub(r'[#*`\[\]()]', '', text)  # Remove markdown chars
    return len(text.split())


def build_post_response(doc: dict) -> BlogPostResponse:
    """Build admin response from DB document."""
    return BlogPostResponse(
        id=doc["id"],
        slug=doc["slug"],
        title=doc["title"],
        content=doc["content"],
        excerpt=doc["excerpt"],
        author=doc["author"],
        status=doc["status"],
        tags=doc.get("tags", []),
        cover_image_url=doc.get("cover_image_url"),
        social_image_url=doc.get("social_image_url"),
        meta_title=doc.get("meta_title", doc["title"]),
        meta_description=doc.get("meta_description", doc["excerpt"]),
        canonical_url=doc.get("canonical_url"),
        word_count=doc.get("word_count", 0),
        reading_time=doc.get("reading_time", 1),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        published_at=doc.get("published_at"),
    )


# ============== ADMIN ROUTES ==============

@admin_router.post("/posts", response_model=BlogPostResponse, status_code=201)
async def create_blog_post(
    data: BlogPostCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a new blog post as draft."""
    now = datetime.now(timezone.utc).isoformat()
    post_id = f"post_{uuid.uuid4().hex[:16]}"
    slug = slugify(data.title)
    
    # Ensure unique slug
    existing = await db.blog_posts.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    
    word_count = count_words(data.content)
    reading_time = max(1, math.ceil(word_count / 230))
    excerpt = generate_excerpt(data.content)
    
    doc = {
        "id": post_id,
        "slug": slug,
        "title": data.title,
        "content": data.content,
        "excerpt": excerpt,
        "author": data.author,
        "status": "draft",
        "tags": data.tags,
        "cover_image_url": data.cover_image_url,
        "social_image_url": data.social_image_url,
        "meta_title": data.meta_title or data.title,
        "meta_description": data.meta_description or excerpt,
        "canonical_url": data.canonical_url or f"{BASE_URL}/blog/{slug}",
        "word_count": word_count,
        "reading_time": reading_time,
        "created_at": now,
        "updated_at": now,
        "published_at": None,
    }
    
    await db.blog_posts.insert_one(doc)
    logger.info(f"Blog post created: {post_id} ({slug})")
    
    return build_post_response(doc)


@admin_router.get("/posts", response_model=BlogPostListResponse)
async def admin_list_blog_posts(
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """List all blog posts (admin — includes drafts)."""
    query = {}
    if status:
        query["status"] = status
    
    total = await db.blog_posts.count_documents(query)
    skip = (page - 1) * limit
    
    posts = await db.blog_posts.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    items = [
        BlogPostListItem(
            id=p["id"],
            slug=p["slug"],
            title=p["title"],
            excerpt=p["excerpt"],
            author=p["author"],
            status=p.get("status"),
            tags=p.get("tags", []),
            cover_image_url=p.get("cover_image_url"),
            reading_time=p.get("reading_time", 1),
            published_at=p.get("published_at") or p["created_at"],
        ) for p in posts
    ]
    
    return BlogPostListResponse(posts=items, total=total, page=page, limit=limit)


@admin_router.get("/posts/{post_id}", response_model=BlogPostResponse)
async def admin_get_blog_post(post_id: str, admin: dict = Depends(get_admin_user)):
    """Get a single blog post by ID (admin)."""
    doc = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not doc:
        raise APIError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message=f"Blog post '{post_id}' not found.",
            status_code=404
        )
    return build_post_response(doc)


@admin_router.patch("/posts/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(
    post_id: str,
    data: BlogPostUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update a blog post."""
    doc = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not doc:
        raise APIError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message=f"Blog post '{post_id}' not found.",
            status_code=404
        )
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.title is not None:
        update["title"] = data.title
        update["slug"] = slugify(data.title)
        if not data.meta_title:
            update["meta_title"] = data.title
    if data.content is not None:
        update["content"] = data.content
        update["excerpt"] = generate_excerpt(data.content)
        update["word_count"] = count_words(data.content)
        update["reading_time"] = max(1, math.ceil(update["word_count"] / 230))
        if not data.meta_description:
            update["meta_description"] = update["excerpt"]
    if data.author is not None:
        update["author"] = data.author
    if data.tags is not None:
        update["tags"] = data.tags
    if data.cover_image_url is not None:
        update["cover_image_url"] = data.cover_image_url
    if data.social_image_url is not None:
        update["social_image_url"] = data.social_image_url
    if data.meta_title is not None:
        update["meta_title"] = data.meta_title
    if data.meta_description is not None:
        update["meta_description"] = data.meta_description
    if data.canonical_url is not None:
        update["canonical_url"] = data.canonical_url
    if data.status is not None:
        update["status"] = data.status
        if data.status == "published" and not doc.get("published_at"):
            update["published_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.blog_posts.update_one({"id": post_id}, {"$set": update})
    
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    return build_post_response(updated)


@admin_router.delete("/posts/{post_id}", status_code=204)
async def delete_blog_post(post_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a blog post."""
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise APIError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message=f"Blog post '{post_id}' not found.",
            status_code=404
        )
    return None


@admin_router.post("/posts/{post_id}/publish", response_model=BlogPostResponse)
async def publish_blog_post(post_id: str, admin: dict = Depends(get_admin_user)):
    """Publish a draft blog post."""
    doc = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    if not doc:
        raise APIError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message=f"Blog post '{post_id}' not found.",
            status_code=404
        )
    
    now = datetime.now(timezone.utc).isoformat()
    update = {
        "status": "published",
        "updated_at": now,
    }
    if not doc.get("published_at"):
        update["published_at"] = now
    
    await db.blog_posts.update_one({"id": post_id}, {"$set": update})
    
    updated = await db.blog_posts.find_one({"id": post_id}, {"_id": 0})
    return build_post_response(updated)


# ============== PUBLIC ROUTES ==============

@public_router.get("/posts", response_model=BlogPostListResponse)
async def list_published_posts(
    page: int = 1,
    limit: int = 20,
    tag: Optional[str] = None,
):
    """List published blog posts (public, no auth)."""
    query = {"status": "published"}
    if tag:
        query["tags"] = tag
    
    total = await db.blog_posts.count_documents(query)
    skip = (page - 1) * limit
    
    posts = await db.blog_posts.find(
        query, {"_id": 0}
    ).sort("published_at", -1).skip(skip).limit(limit).to_list(limit)
    
    items = [
        BlogPostListItem(
            id=p["id"],
            slug=p["slug"],
            title=p["title"],
            excerpt=p["excerpt"],
            author=p["author"],
            tags=p.get("tags", []),
            cover_image_url=p.get("cover_image_url"),
            reading_time=p.get("reading_time", 1),
            published_at=p.get("published_at", p["created_at"]),
        ) for p in posts
    ]
    
    return BlogPostListResponse(posts=items, total=total, page=page, limit=limit)


@public_router.get("/posts/{slug}", response_model=BlogPostPublicResponse)
async def get_published_post(slug: str):
    """Get a published blog post by slug (public, no auth)."""
    doc = await db.blog_posts.find_one(
        {"slug": slug, "status": "published"},
        {"_id": 0}
    )
    if not doc:
        raise APIError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message="Post not found.",
            status_code=404
        )
    
    return BlogPostPublicResponse(
        id=doc["id"],
        slug=doc["slug"],
        title=doc["title"],
        content=doc["content"],
        excerpt=doc["excerpt"],
        author=doc["author"],
        tags=doc.get("tags", []),
        cover_image_url=doc.get("cover_image_url"),
        social_image_url=doc.get("social_image_url"),
        meta_title=doc.get("meta_title", doc["title"]),
        meta_description=doc.get("meta_description", doc["excerpt"]),
        canonical_url=doc.get("canonical_url"),
        word_count=doc.get("word_count", 0),
        reading_time=doc.get("reading_time", 1),
        published_at=doc.get("published_at", doc["created_at"]),
    )


@public_router.get("/rss")
async def get_rss_feed():
    """Generate RSS feed for published blog posts."""
    posts = await db.blog_posts.find(
        {"status": "published"}, {"_id": 0}
    ).sort("published_at", -1).limit(20).to_list(20)
    
    items_xml = ""
    for p in posts:
        # Escape XML special characters
        title = escape(p['title'])
        excerpt = escape(p['excerpt'])
        author = escape(p['author'])
        items_xml += f"""
    <item>
      <title>{title}</title>
      <link>{BASE_URL}/blog/{p['slug']}</link>
      <description>{excerpt}</description>
      <pubDate>{p.get('published_at', p['created_at'])}</pubDate>
      <guid>{BASE_URL}/blog/{p['slug']}</guid>
      <author>hello@agentictrust.com ({author})</author>
    </item>"""
    
    rss = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>RepLedger Blog</title>
    <link>{BASE_URL}/blog</link>
    <description>Insights on agent reputation, trust infrastructure, and the AI agent ecosystem.</description>
    <language>en-us</language>
    <atom:link href="{BASE_URL}/api/blog/rss" rel="self" type="application/rss+xml" />{items_xml}
  </channel>
</rss>"""
    
    return Response(content=rss, media_type="application/rss+xml")
