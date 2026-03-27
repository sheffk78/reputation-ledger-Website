"""
Stripe webhook handler for RepLedger.

Listens for subscription lifecycle events and updates user plans accordingly.
Register this webhook in Stripe Dashboard pointing to:
    https://reputationledger.dev/api/stripe/webhook

Required events:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.payment_failed
    - invoice.paid
"""
import stripe
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException

from core.config import settings
from core.database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stripe", tags=["stripe"])

# Map price IDs to plan names
PRICE_TO_PLAN = {
    settings.STRIPE_PRICE_BUILDER: "builder",
    settings.STRIPE_PRICE_PLATFORM: "platform",
}


def get_plan_from_subscription(subscription) -> str:
    """Extract plan name from a Stripe subscription object."""
    if subscription.get("items") and subscription["items"].get("data"):
        price_id = subscription["items"]["data"][0]["price"]["id"]
        return PRICE_TO_PLAN.get(price_id, "free")
    return "free"


@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events.
    Verifies the webhook signature and processes subscription events.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Stripe webhook received: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(data)

        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(data)

        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(data)

        elif event_type == "invoice.payment_failed":
            await handle_payment_failed(data)

        elif event_type == "invoice.paid":
            await handle_payment_succeeded(data)

        else:
            logger.info(f"Unhandled Stripe event type: {event_type}")

    except Exception as e:
        logger.error(f"Error processing Stripe webhook {event_type}: {e}", exc_info=True)
        # Return 200 anyway so Stripe doesn't retry endlessly
        # Log the error for investigation

    return {"status": "ok"}


async def handle_checkout_completed(session: dict):
    """
    User completed Stripe Checkout. Set up their subscription.

    Triggered by: checkout.session.completed
    """
    user_id = session.get("client_reference_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not user_id:
        # Try metadata fallback
        user_id = session.get("metadata", {}).get("repledger_user_id")

    if not user_id:
        logger.error(f"checkout.session.completed: No user_id found in session {session.get('id')}")
        return

    # Get subscription details to determine plan
    plan = "builder"  # default
    if subscription_id:
        try:
            sub = stripe.Subscription.retrieve(subscription_id)
            plan = get_plan_from_subscription(sub)
            current_period_end = datetime.fromtimestamp(
                sub["current_period_end"], tz=timezone.utc
            ).isoformat()
        except Exception as e:
            logger.error(f"Failed to retrieve subscription {subscription_id}: {e}")
            current_period_end = None
    else:
        current_period_end = None

    # Update user document
    update = {
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "plan": plan,
        "subscription_status": "active",
        "payment_past_due": False,
    }
    if current_period_end:
        update["current_period_end"] = current_period_end

    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update}
    )

    if result.modified_count:
        logger.info(f"User {user_id} upgraded to {plan} (sub: {subscription_id})")
    else:
        logger.warning(f"checkout.session.completed: User {user_id} not found in DB")


async def handle_subscription_updated(subscription: dict):
    """
    Subscription changed (upgrade, downgrade, renewal, payment method update).

    Triggered by: customer.subscription.updated
    """
    customer_id = subscription.get("customer")
    subscription_id = subscription.get("id")
    status = subscription.get("status")  # active, past_due, canceled, etc.

    # Find user by stripe_customer_id
    user = await db.users.find_one(
        {"stripe_customer_id": customer_id},
        {"_id": 0, "id": 1}
    )

    if not user:
        # Try metadata
        user_id = subscription.get("metadata", {}).get("repledger_user_id")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})

    if not user:
        logger.warning(f"subscription.updated: No user found for customer {customer_id}")
        return

    plan = get_plan_from_subscription(subscription)

    current_period_end = None
    if subscription.get("current_period_end"):
        current_period_end = datetime.fromtimestamp(
            subscription["current_period_end"], tz=timezone.utc
        ).isoformat()

    update = {
        "plan": plan,
        "subscription_status": status,
        "stripe_subscription_id": subscription_id,
    }
    if current_period_end:
        update["current_period_end"] = current_period_end

    # If status is active, clear past_due flag
    if status == "active":
        update["payment_past_due"] = False
    elif status == "past_due":
        update["payment_past_due"] = True

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update}
    )

    logger.info(f"User {user['id']} subscription updated: plan={plan}, status={status}")


async def handle_subscription_deleted(subscription: dict):
    """
    Subscription cancelled or expired. Revert to free plan.

    Triggered by: customer.subscription.deleted
    """
    customer_id = subscription.get("customer")

    user = await db.users.find_one(
        {"stripe_customer_id": customer_id},
        {"_id": 0, "id": 1}
    )

    if not user:
        user_id = subscription.get("metadata", {}).get("repledger_user_id")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1})

    if not user:
        logger.warning(f"subscription.deleted: No user found for customer {customer_id}")
        return

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "plan": "free",
            "subscription_status": "canceled",
            "stripe_subscription_id": None,
            "payment_past_due": False,
            "current_period_end": None,
        }}
    )

    logger.info(f"User {user['id']} subscription deleted — reverted to free")


async def handle_payment_failed(invoice: dict):
    """
    A recurring payment failed. Flag the user.

    Triggered by: invoice.payment_failed
    """
    customer_id = invoice.get("customer")

    user = await db.users.find_one(
        {"stripe_customer_id": customer_id},
        {"_id": 0, "id": 1}
    )

    if not user:
        logger.warning(f"invoice.payment_failed: No user found for customer {customer_id}")
        return

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"payment_past_due": True}}
    )

    logger.info(f"User {user['id']} payment failed — flagged as past_due")


async def handle_payment_succeeded(invoice: dict):
    """
    A recurring payment succeeded. Clear any past_due flags.

    Triggered by: invoice.paid
    """
    customer_id = invoice.get("customer")

    user = await db.users.find_one(
        {"stripe_customer_id": customer_id},
        {"_id": 0, "id": 1}
    )

    if not user:
        return  # Not an error — could be a non-subscription invoice

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"payment_past_due": False}}
    )

    logger.info(f"User {user['id']} payment succeeded — cleared past_due flag")
