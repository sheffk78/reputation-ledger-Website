"""
Email Service using Postmark for RepLedger
Handles all transactional emails: welcome, password reset, outcome notifications
"""

import os
import logging
from postmarker.core import PostmarkClient
from typing import Optional

logger = logging.getLogger(__name__)

def get_postmark_client() -> Optional[PostmarkClient]:
    """Get Postmark client, returns None if not configured"""
    api_key = os.environ.get('POSTMARK_API_KEY')
    if not api_key:
        logger.warning("POSTMARK_API_KEY not configured - emails will not be sent")
        return None
    return PostmarkClient(server_token=api_key)

def get_from_email() -> str:
    """Get the from email address"""
    return os.environ.get('POSTMARK_FROM_EMAIL', 'no-reply@contact.agentictrust.app')

def get_public_url() -> str:
    """Get the public URL for links in emails"""
    return os.environ.get('PUBLIC_URL', 'https://reputationledger.dev')


async def send_welcome_email(to_email: str) -> bool:
    """Send welcome email to new user"""
    client = get_postmark_client()
    if not client:
        return False
    
    public_url = get_public_url()
    dashboard_url = f"{public_url}/dashboard"
    
    try:
        client.emails.send(
            From=get_from_email(),
            To=to_email,
            Subject="Welcome to RepLedger - Your Agent Reputation Platform",
            HtmlBody=f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Inter', -apple-system, sans-serif; background-color: #050709; color: #E5E7EB; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #0C1116; border-radius: 12px; padding: 40px; border: 1px solid #1F2933; }}
        .header {{ text-align: center; margin-bottom: 32px; }}
        .logo {{ color: #01696F; font-size: 28px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; }}
        h1 {{ color: #F9FAFB; font-size: 24px; margin-bottom: 16px; }}
        p {{ color: #9CA3AF; line-height: 1.6; margin-bottom: 16px; }}
        .cta {{ display: inline-block; background-color: #01696F; color: #ECFEFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }}
        .footer {{ text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1F2933; color: #6B7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RepLedger</div>
        </div>
        <h1>Welcome to RepLedger!</h1>
        <p>Thank you for signing up. You're now ready to start building trust and transparency for your AI agents.</p>
        <p>With RepLedger, you can:</p>
        <ul style="color: #9CA3AF; line-height: 2;">
            <li>Register your AI agents and track their performance</li>
            <li>Log outcomes and build a verifiable reputation</li>
            <li>Embed trust badges on your website or documentation</li>
            <li>Access your reputation data via our API</li>
        </ul>
        <p>Your API key is ready in your dashboard. Get started by registering your first agent!</p>
        <a href="{dashboard_url}" class="cta">Go to Dashboard</a>
        <div class="footer">
            <p>Part of the AgenticTrust family</p>
            <p>If you didn't create this account, please ignore this email.</p>
        </div>
    </div>
</body>
</html>
            """,
            TextBody=f"""
Welcome to RepLedger!

Thank you for signing up. You're now ready to start building trust and transparency for your AI agents.

With RepLedger, you can:
- Register your AI agents and track their performance
- Log outcomes and build a verifiable reputation
- Embed trust badges on your website or documentation
- Access your reputation data via our API

Your API key is ready in your dashboard. Get started by registering your first agent!

Go to Dashboard: {dashboard_url}

---
Part of the AgenticTrust family
If you didn't create this account, please ignore this email.
            """
        )
        logger.info(f"Welcome email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send welcome email to {to_email}: {e}")
        return False


async def send_password_reset_email(to_email: str, reset_token: str, reset_url: str) -> bool:
    """Send password reset email"""
    client = get_postmark_client()
    if not client:
        return False
    
    try:
        client.emails.send(
            From=get_from_email(),
            To=to_email,
            Subject="Reset Your RepLedger Password",
            HtmlBody=f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Inter', -apple-system, sans-serif; background-color: #050709; color: #E5E7EB; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #0C1116; border-radius: 12px; padding: 40px; border: 1px solid #1F2933; }}
        .header {{ text-align: center; margin-bottom: 32px; }}
        .logo {{ color: #01696F; font-size: 28px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; }}
        h1 {{ color: #F9FAFB; font-size: 24px; margin-bottom: 16px; }}
        p {{ color: #9CA3AF; line-height: 1.6; margin-bottom: 16px; }}
        .cta {{ display: inline-block; background-color: #01696F; color: #ECFEFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }}
        .token {{ background-color: #1F2933; padding: 12px 16px; border-radius: 6px; font-family: monospace; color: #F9FAFB; word-break: break-all; }}
        .footer {{ text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1F2933; color: #6B7280; font-size: 14px; }}
        .warning {{ color: #FBBF24; font-size: 14px; margin-top: 24px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RepLedger</div>
        </div>
        <h1>Reset Your Password</h1>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        <a href="{reset_url}" class="cta">Reset Password</a>
        <p class="warning">This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</p>
        <div class="footer">
            <p>Part of the AgenticTrust family</p>
        </div>
    </div>
</body>
</html>
            """,
            TextBody=f"""
Reset Your RepLedger Password

We received a request to reset your password. Click the link below to set a new password:

{reset_url}

This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

---
Part of the AgenticTrust family
            """
        )
        logger.info(f"Password reset email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {e}")
        return False


async def send_outcome_notification_email(
    to_email: str, 
    agent_name: str, 
    agent_id: str,
    result: str, 
    task_type: str,
    new_score: float,
    new_tier: str
) -> bool:
    """Send email notification when an outcome is logged"""
    client = get_postmark_client()
    if not client:
        return False
    
    public_url = get_public_url()
    agent_url = f"{public_url}/agents/{agent_id}"
    
    # Color based on result
    result_colors = {
        "success": "#10B981",
        "failure": "#EF4444",
        "partial": "#F59E0B",
        "timeout": "#6B7280"
    }
    result_color = result_colors.get(result, "#6B7280")
    result_emoji = {"success": "check", "failure": "X", "partial": "~", "timeout": "..."}
    
    try:
        client.emails.send(
            From=get_from_email(),
            To=to_email,
            Subject=f"Outcome Logged: {agent_name} - {result.upper()}",
            HtmlBody=f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: 'Inter', -apple-system, sans-serif; background-color: #050709; color: #E5E7EB; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background-color: #0C1116; border-radius: 12px; padding: 40px; border: 1px solid #1F2933; }}
        .header {{ text-align: center; margin-bottom: 32px; }}
        .logo {{ color: #01696F; font-size: 28px; font-weight: 700; font-family: 'Space Grotesk', sans-serif; }}
        h1 {{ color: #F9FAFB; font-size: 24px; margin-bottom: 16px; }}
        p {{ color: #9CA3AF; line-height: 1.6; margin-bottom: 16px; }}
        .result-badge {{ display: inline-block; background-color: {result_color}; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 600; text-transform: uppercase; font-size: 14px; }}
        .stats {{ background-color: #1F2933; border-radius: 8px; padding: 20px; margin: 24px 0; }}
        .stat-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #374151; }}
        .stat-row:last-child {{ border-bottom: none; }}
        .stat-label {{ color: #9CA3AF; }}
        .stat-value {{ color: #F9FAFB; font-weight: 600; }}
        .agent-id {{ font-family: monospace; color: #01696F; font-size: 12px; }}
        .cta {{ display: inline-block; background-color: #01696F; color: #ECFEFF; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }}
        .footer {{ text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1F2933; color: #6B7280; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">RepLedger</div>
        </div>
        <h1>New Outcome Logged</h1>
        <p>A new outcome has been recorded for your agent:</p>
        
        <div class="stats">
            <div class="stat-row">
                <span class="stat-label">Agent</span>
                <span class="stat-value">{agent_name}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Agent ID</span>
                <span class="stat-value agent-id">{agent_id}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Result</span>
                <span class="result-badge">{result}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Task Type</span>
                <span class="stat-value">{task_type}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Updated Score</span>
                <span class="stat-value">{new_score}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Current Tier</span>
                <span class="stat-value">{new_tier}</span>
            </div>
        </div>
        
        <a href="{agent_url}" class="cta">View Agent Details</a>
        
        <div class="footer">
            <p>Part of the AgenticTrust family</p>
            <p style="font-size: 12px;">To disable outcome notifications, update your preferences in the dashboard.</p>
        </div>
    </div>
</body>
</html>
            """,
            TextBody=f"""
New Outcome Logged - RepLedger

A new outcome has been recorded for your agent:

Agent: {agent_name}
Agent ID: {agent_id}
Result: {result.upper()}
Task Type: {task_type}
Updated Score: {new_score}
Current Tier: {new_tier}

View Agent Details: {agent_url}

---
Part of the AgenticTrust family
To disable outcome notifications, update your preferences in the dashboard.
            """
        )
        logger.info(f"Outcome notification email sent to {to_email} for agent {agent_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send outcome notification email to {to_email}: {e}")
        return False
