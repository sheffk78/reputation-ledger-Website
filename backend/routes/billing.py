"""
Stripe billing routes for RepLedger.

Handles:
- Creating checkout sessions for plan upgrades
- Stripe webhook processing
- Billing portal sessions for managing subscriptions
- Current plan info
"""
import stripe
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from typing import Optional

from core.config import settings
from core.database import db
from core.dependencies import get_current_user
from core.exceptions import APIError, ErrorCodes
from core.plans import get_plan_limits

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Map Stripe price IDs to plan names
PRICE_TO_PLAN = {
    settings.STRIPE_PRICE_BUILDER: "builder",
    settings.STRIPE_PRICE_PLATFORM: "platform",
}

PLAN_TO_PRICE = {v: k for k, v in PRICE_TO_PLAN.items()}


# ============== MODELS ==============

class CheckoutSessionRequest(BaseModel):
    plan: str  # "builder" or "platform"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str


class BillingPortalResponse(BaseModel):
    portal_url: str


class PlanInfoResponse(BaseModel):
    plan: str
    label: str
    max_agents: Optional[int]
    max_outcomes_per_month: Optional[int]
    agents_used: int
    outcomes_this_month: int
    stripe_customer_id: Optional[str]
    subscription_status: Optional[str]
    payment_past_due: bool
    current_period_end: Optional[str]


# ============== ROUTES ==============

@router.post("/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    data: CheckoutSessionRequest,
    user: dict = Depends(get_current_user)
):
    """
    Create a Stripe Checkout session for upgrading to a paid plan.
    Redirects the user to Stripe Checkout to complete payment.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise APIError(
            code="STRIPE_NOT_CONFIGURED",
            message="Billing is not configured. Please contact support.",
            status_code=503
        )

    price_id = PLAN_TO_PRICE.get(data.plan)
    if not price_id:
        raise APIError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f"Invalid plan: '{data.plan}'. Must be 'builder' or 'platform'.",
            status_code=400
        )

    # Default URLs
    base_url = "https://reputationledger.dev"
    success_url = data.success_url or f"{base_url}/dashboard?billing=success"
    cancel_url = data.cancel_url or f"{base_url}/pricing?billing=cancelled"

    try:
        # Check if user already has a Stripe customer ID
        stripe_customer_id = user.get("stripe_customer_id")

        if not stripe_customer_id:
            # Create a new Stripe customer
            customer = stripe.Customer.create(
                email=user["email"],
                metadata={"repledger_user_id": user["id"]}
            )
            stripe_customer_id = customer.id

            # Store on user document
            await db.users.update_one(
                {"id": user["id"]},
                {"$set": {"stripe_customer_id": stripe_customer_id}}
            )

        # Check if they already have an active subscription
        existing_sub = user.get("stripe_subscription_id")
        if existing_sub:
            # They're changing plans — redirect to billing portal instead
            session = stripe.billing_portal.Session.create(
                customer=stripe_customer_id,
                return_url=success_url,
            )
            return CheckoutSessionResponse(checkout_url=session.url)

        # Create checkout session for new subscription
        session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=user["id"],
            metadata={"repledger_user_id": user["id"], "plan": data.plan},
            subscription_data={
                "metadata": {"repledger_user_id": user["id"], "plan": data.plan}
            }
        )

        return CheckoutSessionResponse(checkout_url=session.url)

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {e}")
        raise APIError(
            code="STRIPE_ERROR",
            message="Failed to create checkout session. Please try again.",
            status_code=502
        )


@router.post("/create-portal-session", response_model=BillingPortalResponse)
async def create_portal_session(user: dict = Depends(get_current_user)):
    """
    Create a Stripe Billing Portal session for managing subscription,
    updating payment method, viewing invoices, or cancelling.
    """
    if not settings.STRIPE_SECRET_KEY:
        raise APIError(
            code="STRIPE_NOT_CONFIGURED",
            message="Billing is not configured.",
            status_code=503
        )

    stripe_customer_id = user.get("stripe_customer_id")
    if not stripe_customer_id:
        raise APIError(
            code=ErrorCodes.VALIDATION_ERROR,
            message="No billing account found. You need to subscribe to a plan first.",
            status_code=400
        )

    try:
        session = stripe.billing_portal.Session.create(
            customer=stripe_customer_id,
            return_url="https://reputationledger.dev/dashboard",
        )
        return BillingPortalResponse(portal_url=session.url)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating portal session: {e}")
        raise APIError(
            code="STRIPE_ERROR",
            message="Failed to open billing portal. Please try again.",
            status_code=502
        )


@router.get("/plan", response_model=PlanInfoResponse)
async def get_current_plan(user: dict = Depends(get_current_user)):
    """
    Get the current user's plan info with usage against limits.
    Used by the dashboard to show the plan card.
    """
    plan = user.get("plan", "free")
    limits = get_plan_limits(plan)

    # Count agents
    agents_used = await db.agents.count_documents({"user_id": user["id"]})

    # Count outcomes this month (first day of current month in UTC)
    now = datetime.now(timezone.utc)
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    agent_ids_cursor = await db.agents.find(
        {"user_id": user["id"]},
        {"agent_id": 1, "_id": 0}
    ).to_list(10000)
    agent_ids = [a["agent_id"] for a in agent_ids_cursor]

    outcomes_this_month = 0
    if agent_ids:
        outcomes_this_month = await db.outcomes.count_documents({
            "agent_id": {"$in": agent_ids},
            "created_at": {"$gte": first_of_month}
        })

    return PlanInfoResponse(
        plan=plan,
        label=limits["label"],
        max_agents=limits["max_agents"],
        max_outcomes_per_month=limits["max_outcomes_per_month"],
        agents_used=agents_used,
        outcomes_this_month=outcomes_this_month,
        stripe_customer_id=user.get("stripe_customer_id"),
        subscription_status=user.get("subscription_status"),
        payment_past_due=user.get("payment_past_due", False),
        current_period_end=user.get("current_period_end"),
    )
