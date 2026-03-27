from typing import List, Tuple, Dict, Optional


def calculate_score_and_tier(outcomes: List[dict]) -> Tuple[float, str, float, Dict[str, int]]:
    """
    Calculate score and tier from outcomes list.
    
    Returns:
        Tuple of (score, tier, success_rate, breakdown)
    """
    total = len(outcomes)
    
    # Calculate breakdown
    breakdown = {
        "success": 0,
        "failure": 0,
        "partial": 0,
        "timeout": 0
    }
    
    for o in outcomes:
        result = o.get("result", "")
        if result in breakdown:
            breakdown[result] += 1
    
    if total == 0:
        return 0.0, "Unrated", 0.0, breakdown
    
    successful = breakdown["success"]
    success_rate = (successful / total) * 100
    score = round(success_rate, 1)
    
    # Determine tier based on spec
    if total < 5:
        tier = "Unrated"
    elif score < 50:
        tier = "Bronze"
    elif score < 75:
        tier = "Silver"
    elif score < 90:
        tier = "Gold"
    elif total >= 50:
        tier = "Platinum"
    else:
        tier = "Gold"  # Score >= 90 but < 50 outcomes
    
    return score, tier, round(success_rate, 1), breakdown


def detect_score_changes(
    old_score: float,
    old_tier: str,
    new_score: float,
    new_tier: str
) -> Dict[str, bool]:
    """
    Detect if score or tier changed significantly.
    
    Returns dict with:
    - score_changed: True if score changed by >= 5 points
    - tier_changed: True if tier boundary crossed
    """
    score_changed = abs(new_score - old_score) >= 5.0
    tier_changed = old_tier != new_tier
    
    return {
        "score_changed": score_changed,
        "tier_changed": tier_changed
    }


async def check_and_emit_score_events(
    agent_id: str,
    old_score: float,
    old_tier: str,
    new_score: float,
    new_tier: str,
    organization_id: Optional[str] = None
):
    """
    Check for significant score changes and emit cross-tool events.
    
    Event types emitted:
    - arl.score.changed: When score changes by >= 5 points
    - arl.tier.changed: When tier boundary crossed
    """
    from routes.internal import emit_cross_tool_event
    
    changes = detect_score_changes(old_score, old_tier, new_score, new_tier)
    
    if changes["score_changed"]:
        await emit_cross_tool_event(
            event_type="arl.score.changed",
            uaid=agent_id,
            org_id=organization_id,
            data={
                "old_score": old_score,
                "new_score": new_score,
                "old_tier": old_tier,
                "new_tier": new_tier,
                "change": round(new_score - old_score, 1)
            }
        )
    
    if changes["tier_changed"]:
        await emit_cross_tool_event(
            event_type="arl.tier.changed",
            uaid=agent_id,
            org_id=organization_id,
            data={
                "old_tier": old_tier,
                "new_tier": new_tier,
                "score": new_score
            }
        )


async def emit_agent_flagged_event(
    agent_id: str,
    flag_id: str,
    reason: str,
    organization_id: Optional[str] = None
):
    """
    Emit event when an agent is flagged.
    
    Event type: arl.agent.flagged
    """
    from routes.internal import emit_cross_tool_event
    
    await emit_cross_tool_event(
        event_type="arl.agent.flagged",
        uaid=agent_id,
        org_id=organization_id,
        data={
            "flag_id": flag_id,
            "reason": reason
        }
    )


def generate_badge_svg(tier: str, score: float) -> str:
    """Generate SVG badge for agent tier and score"""
    # Tier colors from brand guide
    tier_colors = {
        "Unrated": {"bg": "#4B5563", "text": "#E5E7EB"},
        "Bronze": {"bg": "#CD7F32", "text": "#1F2937"},
        "Silver": {"bg": "#C0C0C0", "text": "#1F2937"},
        "Gold": {"bg": "#FFD700", "text": "#1F2937"},
        "Platinum": {"bg": "#01696F", "text": "#ECFEFF"},
    }
    
    colors = tier_colors.get(tier, tier_colors["Unrated"])
    score_display = str(int(score)) if score == int(score) else str(round(score, 1))
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28" viewBox="0 0 120 28">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0C1116"/>
      <stop offset="100%" style="stop-color:#111827"/>
    </linearGradient>
  </defs>
  <rect width="120" height="28" rx="6" fill="url(#bg)" stroke="#1F2933" stroke-width="1"/>
  <rect x="4" y="4" width="52" height="20" rx="4" fill="{colors['bg']}"/>
  <text x="30" y="17.5" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="600" fill="{colors['text']}" text-anchor="middle">{tier}</text>
  <text x="86" y="18" font-family="ui-monospace, monospace" font-size="13" font-weight="700" fill="#F9FAFB" text-anchor="middle">{score_display}</text>
</svg>'''
    return svg


def generate_social_card_svg(
    agent_name: str,
    tier: str,
    score: float,
    success_rate: float,
    outcome_count: int,
    description: str = None,
    owner_handle: str = None
) -> str:
    """
    Generate a 1200x630 SVG social card for sharing agent profiles.
    Optimized for Open Graph and Twitter card images.
    """
    # Tier colors
    tier_colors = {
        "Unrated": {"bg": "#4B5563", "text": "#E5E7EB", "glow": "#4B5563"},
        "Bronze": {"bg": "#CD7F32", "text": "#1F2937", "glow": "#CD7F32"},
        "Silver": {"bg": "#9CA3AF", "text": "#1F2937", "glow": "#9CA3AF"},
        "Gold": {"bg": "#F59E0B", "text": "#1F2937", "glow": "#F59E0B"},
        "Platinum": {"bg": "#01696F", "text": "#ECFEFF", "glow": "#01696F"},
    }
    colors = tier_colors.get(tier, tier_colors["Unrated"])
    
    # Truncate name and description if too long
    display_name = agent_name[:40] + "..." if len(agent_name) > 40 else agent_name
    display_desc = ""
    if description:
        display_desc = description[:120] + "..." if len(description) > 120 else description
    
    # Score display
    score_display = str(int(score)) if score == int(score) else str(round(score, 1))
    success_display = str(int(success_rate)) if success_rate == int(success_rate) else str(round(success_rate, 1))
    
    # Success rate color
    if success_rate >= 90:
        success_color = "#22C55E"
    elif success_rate >= 75:
        success_color = "#84CC16"
    elif success_rate >= 50:
        success_color = "#F59E0B"
    else:
        success_color = "#EF4444"
    
    # Owner handle section
    owner_section = ""
    if owner_handle:
        owner_section = f'''<text x="100" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#6B7280">by {owner_handle}</text>'''
    
    # Description section
    desc_section = ""
    if display_desc:
        desc_section = f'''<text x="100" y="250" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#9CA3AF">{display_desc}</text>'''
    
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <!-- Background gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#050709"/>
      <stop offset="50%" style="stop-color:#0C1116"/>
      <stop offset="100%" style="stop-color:#050709"/>
    </linearGradient>
    <!-- Tier glow -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="20" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <!-- Card shadow -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)"/>
  
  <!-- Grid pattern -->
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1F2933" stroke-width="0.5" opacity="0.3"/>
  </pattern>
  <rect width="1200" height="630" fill="url(#grid)"/>
  
  <!-- Tier glow effect -->
  <circle cx="950" cy="315" r="200" fill="{colors['glow']}" opacity="0.08" filter="url(#glow)"/>
  
  <!-- Left side: Agent info -->
  <g>
    <!-- Agent name -->
    <text x="100" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="700" fill="#FFFFFF">{display_name}</text>
    
    {owner_section}
    {desc_section}
  </g>
  
  <!-- Stats row -->
  <g transform="translate(100, 320)">
    <!-- Score card -->
    <g filter="url(#cardShadow)">
      <rect width="200" height="140" rx="12" fill="#0C1116" stroke="#1F2933" stroke-width="1"/>
      <text x="100" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#6B7280" text-anchor="middle">SCORE</text>
      <text x="100" y="100" font-family="ui-monospace, monospace" font-size="52" font-weight="700" fill="#FFFFFF" text-anchor="middle">{score_display}</text>
    </g>
    
    <!-- Success rate card -->
    <g transform="translate(230, 0)" filter="url(#cardShadow)">
      <rect width="200" height="140" rx="12" fill="#0C1116" stroke="#1F2933" stroke-width="1"/>
      <text x="100" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#6B7280" text-anchor="middle">SUCCESS RATE</text>
      <text x="100" y="100" font-family="ui-monospace, monospace" font-size="52" font-weight="700" fill="{success_color}" text-anchor="middle">{success_display}%</text>
    </g>
    
    <!-- Outcomes card -->
    <g transform="translate(460, 0)" filter="url(#cardShadow)">
      <rect width="200" height="140" rx="12" fill="#0C1116" stroke="#1F2933" stroke-width="1"/>
      <text x="100" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#6B7280" text-anchor="middle">OUTCOMES</text>
      <text x="100" y="100" font-family="ui-monospace, monospace" font-size="52" font-weight="700" fill="#FFFFFF" text-anchor="middle">{outcome_count}</text>
    </g>
  </g>
  
  <!-- Right side: Large tier badge -->
  <g transform="translate(800, 200)">
    <rect x="0" y="0" width="300" height="230" rx="20" fill="#0C1116" stroke="{colors['bg']}" stroke-width="3" filter="url(#cardShadow)"/>
    <rect x="40" y="40" width="220" height="70" rx="12" fill="{colors['bg']}"/>
    <text x="150" y="90" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="700" fill="{colors['text']}" text-anchor="middle">{tier}</text>
    <text x="150" y="175" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="#6B7280" text-anchor="middle">TRUST TIER</text>
  </g>
  
  <!-- Footer: RepLedger branding -->
  <g transform="translate(100, 530)">
    <!-- Logo mark -->
    <rect x="0" y="0" width="40" height="40" rx="8" fill="#01696F"/>
    <g transform="translate(8, 8)">
      <rect x="0" y="0" width="24" height="5" rx="1" fill="white" opacity="0.9"/>
      <rect x="0" y="8" width="24" height="5" rx="1" fill="white" opacity="0.6"/>
      <rect x="0" y="16" width="24" height="5" rx="1" fill="white" opacity="0.3"/>
      <polyline points="0,22 8,14 14,18 24,8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <!-- Text -->
    <text x="55" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="600" fill="#FFFFFF">RepLedger</text>
    <text x="200" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#6B7280">reputationledger.dev</text>
  </g>
</svg>'''
    return svg
