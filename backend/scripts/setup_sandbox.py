"""
One-time script to create the sandbox user and demo agent for the public playground.
Run manually: python scripts/setup_sandbox.py

After running, set these in .env:
  SANDBOX_API_KEY=<printed_key>
  SANDBOX_USER_ID=<printed_id>
"""
import asyncio
import uuid
import secrets
from datetime import datetime, timezone, timedelta
import random
import sys

sys.path.insert(0, '/app/backend')
from core.database import db


async def main():
    now = datetime.now(timezone.utc)
    user_id = f"sandbox_{uuid.uuid4().hex[:12]}"
    api_key = f"arl_{secrets.token_hex(24)}"

    # Check if sandbox user already exists
    existing = await db.users.find_one({"email": "sandbox@reputationledger.dev"})
    if existing:
        print("Sandbox user already exists!")
        print(f"  User ID: {existing['id']}")
        
        # Find API key
        key_doc = await db.api_keys.find_one({"user_id": existing['id'], "revoked_at": None})
        if key_doc:
            print(f"  API Key: {key_doc['key']}")
        
        # Find agent
        agent_doc = await db.agents.find_one({"user_id": existing['id']})
        if agent_doc:
            print(f"  Agent ID: {agent_doc['agent_id']}")
        
        print("\nTo recreate, first delete the existing sandbox data.")
        return

    # Create sandbox user
    user_doc = {
        "id": user_id,
        "email": "sandbox@reputationledger.dev",
        "password_hash": "SANDBOX_NO_LOGIN",
        "is_admin": False,
        "is_sandbox": True,
        "created_at": now.isoformat(),
        "notification_preferences": {
            "email_outcome_alerts": False,
            "email_weekly_summary": False,
            "email_score_changes": False
        }
    }
    await db.users.insert_one(user_doc)
    print(f"Created sandbox user: {user_id}")

    # Create API key
    api_key_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "key": api_key,
        "created_at": now.isoformat(),
        "revoked_at": None,
        "last_used_at": None
    }
    await db.api_keys.insert_one(api_key_doc)
    print(f"Created API key: {api_key[:12]}...")

    # Create demo agent
    agent_id = f"agt_{secrets.token_hex(12)}"
    agent_doc = {
        "agent_id": agent_id,
        "user_id": user_id,
        "name": "Sandbox Support Bot",
        "description": "Demo agent for the public API playground. Try submitting outcomes!",
        "owner_handle": "@sandbox",
        "created_at": now.isoformat(),
        "is_demo": True,
        "is_public": True,
        "is_sandbox": True,
    }
    await db.agents.insert_one(agent_doc)
    print(f"Created demo agent: {agent_id}")

    # Create sample outcomes (15 outcomes over past 7 days)
    results = ["success"] * 10 + ["failure"] * 2 + ["partial"] * 2 + ["timeout"] * 1
    random.shuffle(results)
    task_types = ["api-call", "email-draft", "data-fetch", "ticket-resolve", "code-review"]
    submitter_types = ["self", "operator"]

    for i, result in enumerate(results):
        outcome_doc = {
            "id": str(uuid.uuid4()),
            "agent_id": agent_id,
            "result": result,
            "task_type": random.choice(task_types),
            "submitter_type": random.choice(submitter_types),
            "context": f"Sample outcome #{i + 1} for playground demo",
            "created_at": (now - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23))).isoformat(),
        }
        await db.outcomes.insert_one(outcome_doc)
    print(f"Created {len(results)} sample outcomes")

    print(f"\n{'='*50}")
    print("Sandbox setup complete!")
    print(f"{'='*50}")
    print(f"  User ID:  {user_id}")
    print(f"  API Key:  {api_key}")
    print(f"  Agent ID: {agent_id}")
    print(f"\nAdd to /app/backend/.env:")
    print(f"  SANDBOX_API_KEY={api_key}")
    print(f"  SANDBOX_USER_ID={user_id}")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())
