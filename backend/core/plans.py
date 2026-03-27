"""
Plan definitions and limit enforcement for RepLedger billing.
"""

PLAN_LIMITS = {
    "free": {
        "max_agents": 1,
        "max_outcomes_per_month": 100,
        "label": "Free",
    },
    "builder": {
        "max_agents": 10,
        "max_outcomes_per_month": 5000,
        "label": "Builder",
    },
    "platform": {
        "max_agents": None,  # Unlimited
        "max_outcomes_per_month": 100000,
        "label": "Platform",
    },
    "enterprise": {
        "max_agents": None,  # Unlimited
        "max_outcomes_per_month": None,  # Unlimited
        "label": "Enterprise",
    },
}


def get_plan_limits(plan: str) -> dict:
    """Get limits for a plan. Defaults to free if unknown."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])


def get_plan_label(plan: str) -> str:
    """Get display label for a plan."""
    limits = get_plan_limits(plan)
    return limits["label"]
