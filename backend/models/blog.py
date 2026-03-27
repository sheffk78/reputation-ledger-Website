"""
Blog data models for RepLedger.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class BlogPostStatus(str, Enum):
    draft = "draft"
    published = "published"


class BlogPostCreate(BaseModel):
    """Request to create a blog post via admin API"""
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)  # Markdown content
    author: str = Field(default="Jeff")
    tags: List[str] = []
    cover_image_url: Optional[str] = None
    social_image_url: Optional[str] = None  # 1200x630 for OG/Twitter
    meta_title: Optional[str] = None  # Falls back to title
    meta_description: Optional[str] = None  # Falls back to auto-generated excerpt
    canonical_url: Optional[str] = None  # For cross-posting


class BlogPostUpdate(BaseModel):
    """Request to update a blog post"""
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = None
    author: Optional[str] = None
    tags: Optional[List[str]] = None
    cover_image_url: Optional[str] = None
    social_image_url: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    canonical_url: Optional[str] = None
    status: Optional[BlogPostStatus] = None


class BlogPostResponse(BaseModel):
    """Full blog post response (admin)"""
    id: str
    slug: str
    title: str
    content: str
    excerpt: str
    author: str
    status: str
    tags: List[str]
    cover_image_url: Optional[str] = None
    social_image_url: Optional[str] = None
    meta_title: str
    meta_description: str
    canonical_url: Optional[str] = None
    word_count: int
    reading_time: int  # minutes
    created_at: str
    updated_at: str
    published_at: Optional[str] = None


class BlogPostPublicResponse(BaseModel):
    """Public blog post response (no admin fields)"""
    id: str
    slug: str
    title: str
    content: str
    excerpt: str
    author: str
    tags: List[str]
    cover_image_url: Optional[str] = None
    social_image_url: Optional[str] = None
    meta_title: str
    meta_description: str
    canonical_url: Optional[str] = None
    word_count: int
    reading_time: int
    published_at: str


class BlogPostListItem(BaseModel):
    """Blog post summary for list views"""
    id: str
    slug: str
    title: str
    excerpt: str
    author: str
    status: Optional[str] = None  # Only included for admin
    tags: List[str]
    cover_image_url: Optional[str] = None
    reading_time: int
    published_at: str


class BlogPostListResponse(BaseModel):
    posts: List[BlogPostListItem]
    total: int
    page: int
    limit: int
