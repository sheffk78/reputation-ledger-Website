"""
Test Stripe Billing Integration for RepLedger.

Tests:
- GET /api/billing/plan - returns current plan info with usage stats
- POST /api/billing/create-checkout-session - creates Stripe checkout session
- POST /api/billing/create-portal-session - creates Stripe billing portal session
- POST /api/stripe/webhook - processes Stripe events
- Plan limits enforcement (max agents, max outcomes per month)
"""
import pytest
import requests
import os
import json
import hmac
import hashlib
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "support@agentictrust.app"
ADMIN_PASSWORD = "RepLedger2026!"


class TestBillingPlan:
    """Test GET /api/billing/plan endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_plan_returns_200(self):
        """GET /api/billing/plan returns 200 OK"""
        response = self.session.get(f"{BASE_URL}/api/billing/plan")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_get_plan_returns_correct_structure(self):
        """GET /api/billing/plan returns correct response structure"""
        response = self.session.get(f"{BASE_URL}/api/billing/plan")
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields
        required_fields = [
            "plan", "label", "max_agents", "max_outcomes_per_month",
            "agents_used", "outcomes_this_month", "stripe_customer_id",
            "subscription_status", "payment_past_due", "current_period_end"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_get_plan_returns_usage_stats(self):
        """GET /api/billing/plan returns usage statistics"""
        response = self.session.get(f"{BASE_URL}/api/billing/plan")
        assert response.status_code == 200
        data = response.json()
        
        # Verify usage stats are integers
        assert isinstance(data["agents_used"], int), "agents_used should be int"
        assert isinstance(data["outcomes_this_month"], int), "outcomes_this_month should be int"
        assert data["agents_used"] >= 0, "agents_used should be >= 0"
        assert data["outcomes_this_month"] >= 0, "outcomes_this_month should be >= 0"
    
    def test_get_plan_returns_plan_limits(self):
        """GET /api/billing/plan returns plan limits"""
        response = self.session.get(f"{BASE_URL}/api/billing/plan")
        assert response.status_code == 200
        data = response.json()
        
        # Free plan should have limits
        if data["plan"] == "free":
            assert data["max_agents"] == 1, "Free plan max_agents should be 1"
            assert data["max_outcomes_per_month"] == 100, "Free plan max_outcomes should be 100"
            assert data["label"] == "Free", "Free plan label should be 'Free'"
    
    def test_get_plan_requires_auth(self):
        """GET /api/billing/plan requires authentication"""
        response = requests.get(f"{BASE_URL}/api/billing/plan")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestCheckoutSession:
    """Test POST /api/billing/create-checkout-session endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_create_checkout_session_builder_plan(self):
        """POST /api/billing/create-checkout-session creates session for builder plan"""
        response = self.session.post(f"{BASE_URL}/api/billing/create-checkout-session", json={
            "plan": "builder"
        })
        # Should return 200 with checkout_url or redirect to portal if already subscribed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "checkout_url" in data, "Response should contain checkout_url"
        assert data["checkout_url"].startswith("https://"), "checkout_url should be HTTPS URL"
    
    def test_create_checkout_session_platform_plan(self):
        """POST /api/billing/create-checkout-session creates session for platform plan"""
        response = self.session.post(f"{BASE_URL}/api/billing/create-checkout-session", json={
            "plan": "platform"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "checkout_url" in data, "Response should contain checkout_url"
    
    def test_create_checkout_session_invalid_plan(self):
        """POST /api/billing/create-checkout-session rejects invalid plan"""
        response = self.session.post(f"{BASE_URL}/api/billing/create-checkout-session", json={
            "plan": "invalid_plan"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_create_checkout_session_requires_auth(self):
        """POST /api/billing/create-checkout-session requires authentication"""
        response = requests.post(f"{BASE_URL}/api/billing/create-checkout-session", json={
            "plan": "builder"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_create_checkout_session_with_custom_urls(self):
        """POST /api/billing/create-checkout-session accepts custom success/cancel URLs"""
        response = self.session.post(f"{BASE_URL}/api/billing/create-checkout-session", json={
            "plan": "builder",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"


class TestPortalSession:
    """Test POST /api/billing/create-portal-session endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_create_portal_session_requires_stripe_customer(self):
        """POST /api/billing/create-portal-session requires stripe_customer_id"""
        # First check if user has stripe_customer_id
        plan_response = self.session.get(f"{BASE_URL}/api/billing/plan")
        plan_data = plan_response.json()
        
        response = self.session.post(f"{BASE_URL}/api/billing/create-portal-session")
        
        if plan_data.get("stripe_customer_id"):
            # User has stripe customer - should return portal URL
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            assert "portal_url" in data, "Response should contain portal_url"
            assert data["portal_url"].startswith("https://"), "portal_url should be HTTPS URL"
        else:
            # User doesn't have stripe customer - should return 400
            assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
    
    def test_create_portal_session_requires_auth(self):
        """POST /api/billing/create-portal-session requires authentication"""
        response = requests.post(f"{BASE_URL}/api/billing/create-portal-session")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestStripeWebhook:
    """Test POST /api/stripe/webhook endpoint"""
    
    def test_webhook_requires_signature(self):
        """POST /api/stripe/webhook requires stripe-signature header"""
        response = requests.post(f"{BASE_URL}/api/stripe/webhook", json={
            "type": "checkout.session.completed",
            "data": {"object": {}}
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        # Should mention missing signature
        assert "signature" in response.text.lower() or "stripe" in response.text.lower()
    
    def test_webhook_rejects_invalid_signature(self):
        """POST /api/stripe/webhook rejects invalid signature"""
        response = requests.post(
            f"{BASE_URL}/api/stripe/webhook",
            data=json.dumps({"type": "test", "data": {"object": {}}}),
            headers={
                "Content-Type": "application/json",
                "stripe-signature": "invalid_signature"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"


class TestPlanLimitsEnforcement:
    """Test plan limits enforcement on agent creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token + API key"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get API key for v1 endpoints
        api_key_response = self.session.get(f"{BASE_URL}/api/api-key")
        if api_key_response.status_code == 200:
            self.api_key = api_key_response.json().get("api_key")
        else:
            self.api_key = None
    
    def test_free_plan_agent_limit_enforced(self):
        """Free plan users cannot exceed max_agents limit"""
        # First check current plan
        plan_response = self.session.get(f"{BASE_URL}/api/billing/plan")
        plan_data = plan_response.json()
        
        if plan_data["plan"] != "free":
            pytest.skip("User is not on free plan")
        
        # Check current agent count
        agents_used = plan_data["agents_used"]
        max_agents = plan_data["max_agents"]
        
        print(f"Current agents: {agents_used}/{max_agents}")
        
        if agents_used >= max_agents:
            # User is at limit - try to create another agent
            if self.api_key:
                response = requests.post(
                    f"{BASE_URL}/api/v1/agents",
                    json={"name": "TEST_limit_agent", "description": "Test agent"},
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}"
                    }
                )
                assert response.status_code == 403, f"Expected 403 PLAN_LIMIT_REACHED, got {response.status_code}: {response.text}"
                data = response.json()
                # Check for error code in nested structure
                error_code = data.get("code") or data.get("error", {}).get("code")
                assert error_code == "PLAN_LIMIT_REACHED", f"Expected PLAN_LIMIT_REACHED error code, got: {data}"
                print(f"PLAN_LIMIT_REACHED correctly returned: {data}")
            else:
                pytest.skip("No API key available")
        else:
            print(f"User has {max_agents - agents_used} agent slots remaining")
    
    def test_plan_limit_error_includes_details(self):
        """PLAN_LIMIT_REACHED error includes helpful details"""
        plan_response = self.session.get(f"{BASE_URL}/api/billing/plan")
        plan_data = plan_response.json()
        
        if plan_data["plan"] != "free" or plan_data["agents_used"] < plan_data["max_agents"]:
            pytest.skip("User not at agent limit")
        
        if not self.api_key:
            pytest.skip("No API key available")
        
        response = requests.post(
            f"{BASE_URL}/api/v1/agents",
            json={"name": "TEST_limit_agent", "description": "Test agent"},
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
        )
        
        assert response.status_code == 403
        data = response.json()
        
        # Verify error details (may be nested under 'error')
        error_data = data.get("error", data)
        assert "details" in error_data, "Error should include details"
        details = error_data["details"]
        assert "limit_type" in details, "Details should include limit_type"
        assert "current" in details, "Details should include current count"
        assert "limit" in details, "Details should include limit"
        assert "plan" in details, "Details should include plan name"


class TestPlanLimitsOutcomes:
    """Test plan limits enforcement on outcome creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token + API key"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get API key for v1 endpoints
        api_key_response = self.session.get(f"{BASE_URL}/api/api-key")
        if api_key_response.status_code == 200:
            self.api_key = api_key_response.json().get("api_key")
        else:
            self.api_key = None
    
    def test_outcome_limit_tracked(self):
        """Outcomes this month are tracked in plan info"""
        plan_response = self.session.get(f"{BASE_URL}/api/billing/plan")
        plan_data = plan_response.json()
        
        assert "outcomes_this_month" in plan_data
        assert "max_outcomes_per_month" in plan_data
        
        print(f"Outcomes this month: {plan_data['outcomes_this_month']}/{plan_data['max_outcomes_per_month']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
