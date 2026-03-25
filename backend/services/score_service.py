from typing import List, Tuple, Dict


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
