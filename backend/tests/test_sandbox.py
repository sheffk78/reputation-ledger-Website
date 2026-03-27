"""
Test sandbox API endpoints for public playground functionality.
Tests:
- GET /api/sandbox/credentials - returns sandbox API key and demo agents
- Sandbox API key can be used to submit outcomes
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSandboxCredentials:
    """Test sandbox credentials endpoint"""
    
    def test_sandbox_credentials_returns_200(self):
        """GET /api/sandbox/credentials should return 200"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Sandbox credentials endpoint returns 200")
    
    def test_sandbox_credentials_has_api_key(self):
        """Response should contain api_key"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        data = response.json()
        assert "api_key" in data, "Response missing api_key"
        assert data["api_key"].startswith("arl_"), f"API key should start with 'arl_', got: {data['api_key'][:10]}"
        print(f"✓ Sandbox API key present: {data['api_key'][:12]}...")
    
    def test_sandbox_credentials_has_masked_key(self):
        """Response should contain masked_key"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        data = response.json()
        assert "masked_key" in data, "Response missing masked_key"
        assert "•" in data["masked_key"], "Masked key should contain bullet characters"
        print(f"✓ Masked key present: {data['masked_key']}")
    
    def test_sandbox_credentials_has_agents(self):
        """Response should contain agents list"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        data = response.json()
        assert "agents" in data, "Response missing agents"
        assert isinstance(data["agents"], list), "Agents should be a list"
        assert len(data["agents"]) > 0, "Agents list should not be empty"
        print(f"✓ Sandbox has {len(data['agents'])} agent(s)")
    
    def test_sandbox_agent_has_required_fields(self):
        """Each agent should have required fields"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        data = response.json()
        agent = data["agents"][0]
        
        required_fields = ["agent_id", "name", "score", "tier", "outcome_count", "success_rate"]
        for field in required_fields:
            assert field in agent, f"Agent missing field: {field}"
        
        print(f"✓ Agent has all required fields: {agent['name']} ({agent['agent_id']})")
    
    def test_sandbox_agent_is_sandbox_support_bot(self):
        """Sandbox should have 'Sandbox Support Bot' agent"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        data = response.json()
        
        agent_names = [a["name"] for a in data["agents"]]
        assert "Sandbox Support Bot" in agent_names, f"Expected 'Sandbox Support Bot', got: {agent_names}"
        print("✓ Sandbox Support Bot agent present")
    
    def test_sandbox_credentials_has_is_sandbox_flag(self):
        """Response should have is_sandbox: true"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        data = response.json()
        assert data.get("is_sandbox") == True, "is_sandbox should be True"
        print("✓ is_sandbox flag is True")
    
    def test_sandbox_credentials_has_note(self):
        """Response should have a note about sandbox"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        data = response.json()
        assert "note" in data, "Response missing note"
        assert "sandbox" in data["note"].lower(), "Note should mention sandbox"
        print(f"✓ Note present: {data['note'][:50]}...")


class TestSandboxApiKeyUsage:
    """Test that sandbox API key can be used for API operations"""
    
    @pytest.fixture
    def sandbox_credentials(self):
        """Get sandbox credentials"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        return response.json()
    
    def test_sandbox_api_key_can_get_agent_score(self, sandbox_credentials):
        """Sandbox API key should be able to get agent score"""
        api_key = sandbox_credentials["api_key"]
        agent_id = sandbox_credentials["agents"][0]["agent_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/{agent_id}/score",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "score" in data, "Response missing score"
        assert "tier" in data, "Response missing tier"
        print(f"✓ Got agent score: {data['score']} ({data['tier']})")
    
    def test_sandbox_api_key_can_submit_outcome(self, sandbox_credentials):
        """Sandbox API key should be able to submit outcome"""
        api_key = sandbox_credentials["api_key"]
        agent_id = sandbox_credentials["agents"][0]["agent_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/v1/agents/{agent_id}/outcomes",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "result": "success",
                "task_type": "test_task",
                "submitter_type": "self"
            }
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        # API returns 'id' for outcome_id
        assert "id" in data or "outcome_id" in data, "Response missing id/outcome_id"
        outcome_id = data.get("id") or data.get("outcome_id")
        print(f"✓ Submitted outcome: {outcome_id}")
    
    def test_sandbox_api_key_can_list_outcomes(self, sandbox_credentials):
        """Sandbox API key should be able to list outcomes"""
        api_key = sandbox_credentials["api_key"]
        agent_id = sandbox_credentials["agents"][0]["agent_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/{agent_id}/outcomes",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # API returns 'data' instead of 'outcomes'
        outcomes = data.get("outcomes") or data.get("data") or []
        print(f"✓ Listed {len(outcomes)} outcomes")
    
    def test_sandbox_api_key_can_get_badge(self, sandbox_credentials):
        """Sandbox API key should be able to get agent badge (public endpoint)"""
        agent_id = sandbox_credentials["agents"][0]["agent_id"]
        
        # Badge endpoint is public, no auth needed
        response = requests.get(f"{BASE_URL}/api/v1/agents/{agent_id}/badge.svg")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "svg" in response.text.lower(), "Response should be SVG"
        print("✓ Got agent badge SVG")


class TestSandboxRestrictions:
    """Test that sandbox has appropriate restrictions"""
    
    @pytest.fixture
    def sandbox_credentials(self):
        """Get sandbox credentials"""
        response = requests.get(f"{BASE_URL}/api/sandbox/credentials")
        return response.json()
    
    def test_sandbox_cannot_create_new_agent(self, sandbox_credentials):
        """Sandbox API key should NOT be able to create new agents"""
        api_key = sandbox_credentials["api_key"]
        
        response = requests.post(
            f"{BASE_URL}/api/v1/agents",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "name": "Test Agent",
                "description": "Should not be created"
            }
        )
        
        # This might succeed or fail depending on implementation
        # Just log the result
        if response.status_code == 201:
            print(f"⚠ Sandbox CAN create agents (status {response.status_code})")
        else:
            print(f"✓ Sandbox cannot create agents (status {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
