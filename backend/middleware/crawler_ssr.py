"""
Crawler Detection Middleware for SSR routing.

This module provides utilities for detecting social media crawler user agents
and serves as documentation for proxy configuration.
"""
import re

# Known crawler user agents that need SSR
CRAWLER_PATTERNS = [
    # Facebook
    r'facebookexternalhit',
    r'Facebot',
    # Twitter
    r'Twitterbot',
    # LinkedIn
    r'LinkedInBot',
    # Slack
    r'Slackbot',
    # Discord
    r'Discordbot',
    # Telegram
    r'TelegramBot',
    # WhatsApp
    r'WhatsApp',
    # Google (for rich results)
    r'Googlebot',
    r'Google-InspectionTool',
    # Bing
    r'bingbot',
    # Pinterest
    r'Pinterest',
    # Embedly
    r'Embedly',
    # Quora
    r'Quora Link Preview',
    # Showyoubot
    r'Showyoubot',
    # Outbrain
    r'outbrain',
    # Rogerbot (Moz)
    r'rogerbot',
    # Vkontakte
    r'vkShare',
    # W3C Validator
    r'W3C_Validator',
]

# Compile regex pattern for efficiency
CRAWLER_REGEX = re.compile('|'.join(CRAWLER_PATTERNS), re.IGNORECASE)


def is_crawler(user_agent: str) -> bool:
    """Check if the user agent is a known crawler."""
    if not user_agent:
        return False
    return bool(CRAWLER_REGEX.search(user_agent))


# ============================================================
# NGINX CONFIGURATION FOR CRAWLER ROUTING
# ============================================================
# 
# Add this to your nginx configuration to route crawlers to SSR:
#
# map $http_user_agent $is_crawler {
#     default 0;
#     ~*facebookexternalhit 1;
#     ~*Facebot 1;
#     ~*Twitterbot 1;
#     ~*LinkedInBot 1;
#     ~*Slackbot 1;
#     ~*Discordbot 1;
#     ~*TelegramBot 1;
#     ~*WhatsApp 1;
#     ~*Googlebot 1;
#     ~*bingbot 1;
#     ~*Pinterest 1;
# }
#
# location ~ ^/blog/(.+)$ {
#     if ($is_crawler) {
#         rewrite ^/blog/(.+)$ /api/ssr/blog/$1 break;
#         proxy_pass http://backend;
#     }
#     try_files $uri /index.html;
# }
#
# location ~ ^/agent/(.+)$ {
#     if ($is_crawler) {
#         rewrite ^/agent/(.+)$ /api/ssr/agent/$1 break;
#         proxy_pass http://backend;
#     }
#     try_files $uri /index.html;
# }
# ============================================================


# ============================================================
# CLOUDFLARE WORKERS CONFIGURATION
# ============================================================
#
# export default {
#   async fetch(request, env) {
#     const url = new URL(request.url);
#     const userAgent = request.headers.get('user-agent') || '';
#     
#     const crawlerPatterns = [
#       /facebookexternalhit/i,
#       /Twitterbot/i,
#       /LinkedInBot/i,
#       /Slackbot/i,
#       /Discordbot/i,
#       /WhatsApp/i,
#       /Googlebot/i,
#     ];
#     
#     const isCrawler = crawlerPatterns.some(p => p.test(userAgent));
#     
#     if (isCrawler) {
#       if (url.pathname.startsWith('/blog/')) {
#         const slug = url.pathname.replace('/blog/', '');
#         return fetch(`${url.origin}/api/ssr/blog/${slug}`);
#       }
#       if (url.pathname.startsWith('/agent/')) {
#         const id = url.pathname.replace('/agent/', '');
#         return fetch(`${url.origin}/api/ssr/agent/${id}`);
#       }
#     }
#     
#     return fetch(request);
#   }
# };
# ============================================================

