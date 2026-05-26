"""
Server-Side Rendering routes for SEO meta tag injection.

This module provides HTML responses with pre-populated meta tags for
social media crawlers (Facebook, Twitter, LinkedIn, etc.) that don't
execute JavaScript.
"""
import os
import re
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from core.database import db

router = APIRouter(tags=["SSR"])

# Base HTML template with placeholder meta tags
# This will be served for social media crawlers
BASE_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#01696F" />
    
    <!-- Primary Meta Tags -->
    <title>{title}</title>
    <meta name="title" content="{title}" />
    <meta name="description" content="{description}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="{og_type}" />
    <meta property="og:url" content="{url}" />
    <meta property="og:title" content="{title}" />
    <meta property="og:description" content="{description}" />
    <meta property="og:image" content="{image}" />
    <meta property="og:site_name" content="RepLedger" />
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="{url}" />
    <meta property="twitter:title" content="{title}" />
    <meta property="twitter:description" content="{description}" />
    <meta property="twitter:image" content="{image}" />
    
    <!-- Article specific -->
    {article_meta}
    
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {json_ld}
    </script>
    
    <!-- Canonical URL -->
    <link rel="canonical" href="{canonical_url}" />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap" rel="stylesheet" />
    
    <!-- Scripts -->
    <script>window.addEventListener("error",function(e){{if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){{e.stopImmediatePropagation();e.preventDefault()}}}},true);</script>
    <script src="https://assets.emergent.sh/scripts/emergent-main.js"></script>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    <script>
        // Redirect to the React app which will handle the actual rendering
        // This ensures crawlers get the meta tags while users get the full React app
    </script>
</body>
</html>"""


def escape_html(text: str) -> str:
    """Escape HTML special characters"""
    if not text:
        return ""
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;"))


def create_json_ld_article(post: dict) -> str:
    """Create JSON-LD structured data for a blog article"""
    import json
    
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": escape_html(post.get("title", "")),
        "description": escape_html(post.get("meta_description", post.get("excerpt", ""))),
        "image": post.get("social_image_url") or post.get("cover_image_url") or "https://reputationledger.dev/og-default.png",
        "author": {
            "@type": "Person",
            "name": escape_html(post.get("author", "RepLedger"))
        },
        "publisher": {
            "@type": "Organization",
            "name": "RepLedger",
            "logo": {
                "@type": "ImageObject",
                "url": "/repledger-logo-dark.svg"
            }
        },
        "datePublished": post.get("published_at", ""),
        "dateModified": post.get("updated_at", post.get("published_at", "")),
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": f"https://reputationledger.dev/blog/{post.get('slug', '')}"
        }
    }
    
    return json.dumps(json_ld, indent=2)


@router.get("/blog/{slug}", response_class=HTMLResponse)
async def get_blog_post_ssr(slug: str, request: Request):
    """
    Serve blog post with pre-rendered meta tags for SEO.
    
    This endpoint returns HTML with proper Open Graph and Twitter Card
    meta tags populated from the database, enabling proper social sharing
    previews even for JavaScript-disabled crawlers.
    """
    # Fetch the post from database
    post = await db.blog_posts.find_one(
        {"slug": slug, "status": "published"},
        {"_id": 0}
    )
    
    if not post:
        # Return basic HTML that will show 404 in React
        return HTMLResponse(
            content=BASE_HTML_TEMPLATE.format(
                title="Post Not Found | RepLedger Blog",
                description="The requested blog post could not be found.",
                og_type="website",
                url=f"https://reputationledger.dev/blog/{slug}",
                image="https://reputationledger.dev/og-default.png",
                article_meta="",
                json_ld="{}",
                canonical_url=f"https://reputationledger.dev/blog/{slug}"
            ),
            status_code=200  # Let React handle the 404 display
        )
    
    # Build meta tags
    title = escape_html(post.get("meta_title", post.get("title", "RepLedger Blog")))
    description = escape_html(post.get("meta_description", post.get("excerpt", "")))[:160]
    image = post.get("social_image_url") or post.get("cover_image_url") or "https://reputationledger.dev/og-default.png"
    url = f"https://reputationledger.dev/blog/{slug}"
    canonical = post.get("canonical_url", url)
    
    # Article-specific meta tags
    article_meta_parts = []
    if post.get("published_at"):
        article_meta_parts.append(f'<meta property="article:published_time" content="{post["published_at"]}" />')
    if post.get("updated_at"):
        article_meta_parts.append(f'<meta property="article:modified_time" content="{post["updated_at"]}" />')
    if post.get("author"):
        article_meta_parts.append(f'<meta property="article:author" content="{escape_html(post["author"])}" />')
    for tag in post.get("tags", []):
        article_meta_parts.append(f'<meta property="article:tag" content="{escape_html(tag)}" />')
    
    article_meta = "\n    ".join(article_meta_parts)
    
    # Generate JSON-LD
    json_ld = create_json_ld_article(post)
    
    html = BASE_HTML_TEMPLATE.format(
        title=f"{title} | RepLedger Blog",
        description=description,
        og_type="article",
        url=url,
        image=image,
        article_meta=article_meta,
        json_ld=json_ld,
        canonical_url=canonical
    )
    
    return HTMLResponse(content=html, status_code=200)


@router.get("/agent/{agent_id}", response_class=HTMLResponse)
async def get_agent_ssr(agent_id: str, request: Request):
    """
    Serve public agent profile with pre-rendered meta tags for SEO.
    """
    from services.score_service import calculate_score_and_tier
    
    # Fetch the agent from database
    agent = await db.agents.find_one(
        {"agent_id": agent_id, "is_public": True},
        {"_id": 0}
    )
    
    if not agent:
        return HTMLResponse(
            content=BASE_HTML_TEMPLATE.format(
                title="Agent Not Found | RepLedger",
                description="The requested agent profile could not be found.",
                og_type="website",
                url=f"https://reputationledger.dev/agent/{agent_id}",
                image="https://reputationledger.dev/og-default.png",
                article_meta="",
                json_ld="{}",
                canonical_url=f"https://reputationledger.dev/agent/{agent_id}"
            ),
            status_code=200
        )
    
    # Get score info
    outcomes = await db.outcomes.find({"agent_id": agent_id}, {"_id": 0}).to_list(10000)
    score, tier, _, _ = calculate_score_and_tier(outcomes)
    
    name = escape_html(agent.get("name", "Agent"))
    description = escape_html(agent.get("description", f"View {name}'s reputation score and performance history on RepLedger."))[:160]
    
    # Use social card image if available
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "https://reputationledger.dev")
    image = f"{backend_url}/api/agents/{agent_id}/social-card"
    
    url = f"https://reputationledger.dev/agent/{agent_id}"
    
    # JSON-LD for agent
    import json
    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": name,
        "description": description,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": score,
            "bestRating": 100,
            "worstRating": 0,
            "ratingCount": len(outcomes)
        }
    }, indent=2)
    
    html = BASE_HTML_TEMPLATE.format(
        title=f"{name} ({tier}) | RepLedger",
        description=f"{name} has a {tier} trust rating with a score of {score}. {description}",
        og_type="website",
        url=url,
        image=image,
        article_meta="",
        json_ld=json_ld,
        canonical_url=url
    )
    
    return HTMLResponse(content=html, status_code=200)


# ============================================================
# CRAWLER-AWARE ROUTES
# These routes are registered at root level and detect crawlers
# ============================================================

from middleware.crawler_ssr import is_crawler

# Create a separate router for crawler-aware routes at root level
crawler_router = APIRouter(tags=["Crawler-SSR"])


@crawler_router.get("/blog/{slug}", response_class=HTMLResponse)
async def blog_crawler_route(slug: str, request: Request):
    """
    Serve blog posts - returns SSR HTML for crawlers, 
    passes through to React app for regular users.
    """
    user_agent = request.headers.get('user-agent', '')
    
    if is_crawler(user_agent):
        # Serve SSR content for crawlers
        return await get_blog_post_ssr(slug, request)
    
    # For regular users, return minimal HTML that loads React
    # The React app will handle the actual rendering
    return HTMLResponse(
        content=f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=/blog/{slug}" />
    <script>window.location.href = "/blog/{slug}";</script>
</head>
<body>
    <p>Loading...</p>
</body>
</html>''',
        status_code=200
    )


@crawler_router.get("/agent/{agent_id}", response_class=HTMLResponse)
async def agent_crawler_route(agent_id: str, request: Request):
    """
    Serve agent profiles - returns SSR HTML for crawlers,
    passes through to React app for regular users.
    """
    user_agent = request.headers.get('user-agent', '')
    
    if is_crawler(user_agent):
        # Serve SSR content for crawlers
        return await get_agent_ssr(agent_id, request)
    
    # For regular users, redirect to the React route
    return HTMLResponse(
        content=f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0;url=/agent/{agent_id}" />
    <script>window.location.href = "/agent/{agent_id}";</script>
</head>
<body>
    <p>Loading...</p>
</body>
</html>''',
        status_code=200
    )

