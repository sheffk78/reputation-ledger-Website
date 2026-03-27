"""
Test Admin Client Management API - Prompt 5 Features
Tests for:
- POST /api/admin/full-setup (create user + agents + webhooks)
- GET /api/admin/lookup/user
- GET /api/admin/lookup/agent
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "support@agentictrust.app"
ADMIN_PASSWORD = "RepLedger2026!"


class TestAdminClientManagement:
    """Test admin client provisioning endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.admin_token = token
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    def test_admin_verify_access(self):
        """Test admin access verification"""
        response = self.session.get(f"{BASE_URL}/api/admin/me")
        assert response.status_code == 200, f"Admin verify failed: {response.text}"
        data = response.json()
        assert data["is_admin"] == True
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin access verified for {data['email']}")
    
    def test_full_setup_creates_user_agents_webhooks(self):
        """Test POST /api/admin/full-setup creates complete client setup"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_client_{unique_id}@example.com"
        
        payload = {
            "email": test_email,
            "password": "SecurePass123!",
            "agents": [
                {"name": f"test-agent-{unique_id}", "description": "Test agent", "is_public": False},
                {"name": f"public-agent-{unique_id}", "description": "Public test agent", "is_public": True}
            ],
            "webhooks": [
                {"url": "https://example.com/webhook", "events": ["outcome.created"]}
            ]
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/full-setup", json=payload)
        assert response.status_code == 201, f"Full setup failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "user_id" in data, "Missing user_id in response"
        assert "email" in data, "Missing email in response"
        assert "api_key" in data, "Missing api_key in response"
        assert "agents" in data, "Missing agents in response"
        assert "webhooks_created" in data, "Missing webhooks_created in response"
        
        # Verify values
        assert data["email"] == test_email
        assert data["api_key"].startswith("arl_"), "API key should start with arl_"
        assert len(data["agents"]) == 2, "Should have created 2 agents"
        assert data["webhooks_created"] == 1, "Should have created 1 webhook"
        
        # Verify agents have IDs and names
        for agent in data["agents"]:
            assert "agent_id" in agent
            assert "name" in agent
        
        print(f"✓ Full setup created user {test_email} with {len(data['agents'])} agents and {data['webhooks_created']} webhooks")
        
        # Store for cleanup
        self.created_user_id = data["user_id"]
        
        # Cleanup - delete the test user
        cleanup_response = self.session.delete(f"{BASE_URL}/api/admin/users/{data['user_id']}")
        assert cleanup_response.status_code == 204, f"Cleanup failed: {cleanup_response.text}"
        print(f"✓ Cleaned up test user {test_email}")
    
    def test_full_setup_duplicate_email_returns_409(self):
        """Test that full-setup returns 409 for duplicate email"""
        # First create a user
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_dup_{unique_id}@example.com"
        
        payload = {
            "email": test_email,
            "password": "SecurePass123!",
            "agents": [{"name": f"agent-{unique_id}", "description": "Test"}]
        }
        
        # First creation should succeed
        response1 = self.session.post(f"{BASE_URL}/api/admin/full-setup", json=payload)
        assert response1.status_code == 201, f"First creation failed: {response1.text}"
        user_id = response1.json()["user_id"]
        
        # Second creation with same email should fail with 409
        response2 = self.session.post(f"{BASE_URL}/api/admin/full-setup", json=payload)
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}"
        
        print(f"✓ Duplicate email correctly returns 409")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/users/{user_id}")
    
    def test_full_setup_validation_errors(self):
        """Test validation errors for full-setup"""
        # Missing email
        response = self.session.post(f"{BASE_URL}/api/admin/full-setup", json={
            "password": "SecurePass123!",
            "agents": [{"name": "test"}]
        })
        assert response.status_code == 422, f"Expected 422 for missing email, got {response.status_code}"
        
        # Password too short
        response = self.session.post(f"{BASE_URL}/api/admin/full-setup", json={
            "email": "test@example.com",
            "password": "short",
            "agents": [{"name": "test"}]
        })
        assert response.status_code == 422, f"Expected 422 for short password, got {response.status_code}"
        
        print("✓ Validation errors correctly returned")
    
    def test_lookup_user_by_email(self):
        """Test GET /api/admin/lookup/user?email=..."""
        # Lookup the admin user
        response = self.session.get(f"{BASE_URL}/api/admin/lookup/user?email={ADMIN_EMAIL}")
        assert response.status_code == 200, f"Lookup failed: {response.text}"
        
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "id" in data
        assert "is_admin" in data
        assert "agent_count" in data
        assert "created_at" in data
        
        print(f"✓ User lookup returned: {data['email']} (admin={data['is_admin']})")
    
    def test_lookup_user_not_found(self):
        """Test lookup returns 404 for non-existent user"""
        response = self.session.get(f"{BASE_URL}/api/admin/lookup/user?email=nonexistent@example.com")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent user correctly returns 404")
    
    def test_admin_stats_endpoint(self):
        """Test GET /api/admin/stats returns platform statistics"""
        response = self.session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200, f"Stats failed: {response.text}"
        
        data = response.json()
        assert "total_users" in data
        assert "total_agents" in data
        assert "total_outcomes" in data
        assert "outcomes_last_7_days" in data
        assert "outcomes_last_24_hours" in data
        assert "new_users_last_7_days" in data
        
        print(f"✓ Stats: {data['total_users']} users, {data['total_agents']} agents, {data['total_outcomes']} outcomes")
    
    def test_admin_users_list(self):
        """Test GET /api/admin/users returns user list"""
        response = self.session.get(f"{BASE_URL}/api/admin/users?limit=10")
        assert response.status_code == 200, f"Users list failed: {response.text}"
        
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert isinstance(data["users"], list)
        
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "id" in user
            assert "email" in user
            assert "is_admin" in user
            assert "agent_count" in user
        
        print(f"✓ Users list returned {len(data['users'])} users (total: {data['total']})")
    
    def test_admin_agents_list(self):
        """Test GET /api/admin/agents returns agent list"""
        response = self.session.get(f"{BASE_URL}/api/admin/agents?limit=10")
        assert response.status_code == 200, f"Agents list failed: {response.text}"
        
        data = response.json()
        assert "agents" in data
        assert "total" in data
        assert isinstance(data["agents"], list)
        
        if len(data["agents"]) > 0:
            agent = data["agents"][0]
            assert "agent_id" in agent
            assert "name" in agent
            assert "owner_email" in agent
            assert "score" in agent
            assert "tier" in agent
        
        print(f"✓ Agents list returned {len(data['agents'])} agents (total: {data['total']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
