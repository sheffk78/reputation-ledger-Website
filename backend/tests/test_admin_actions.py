"""
Test P1 Admin Actions - User and Agent Management
Tests for:
- Admin toggle user role (make admin / remove admin)
- Admin cannot demote themselves
- Admin delete user (with cascade)
- Admin cannot delete themselves
- Admin update agent (name, description)
- Admin delete agent
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "support@agentictrust.app"
ADMIN_PASSWORD = "RepLedger2026!"


class TestAdminActions:
    """Test admin user and agent management actions"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def admin_user_id(self, admin_token):
        """Get admin user ID"""
        response = requests.get(f"{BASE_URL}/api/admin/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    @pytest.fixture
    def test_user(self, admin_headers):
        """Create a test user for testing admin actions"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_admin_action_{unique_id}@test.com"
        password = "TestPass123!"
        
        # Create user via signup
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": password
        })
        assert response.status_code in [200, 201], f"Failed to create test user: {response.text}"
        user_data = response.json()
        
        yield {
            "id": user_data["user"]["id"],
            "email": email,
            "password": password,
            "token": user_data["access_token"]
        }
        
        # Cleanup: Try to delete the user if it still exists
        try:
            requests.delete(f"{BASE_URL}/api/admin/users/{user_data['user']['id']}", headers=admin_headers)
        except:
            pass
    
    @pytest.fixture
    def test_agent(self, test_user, admin_headers):
        """Create a test agent for testing admin actions"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create agent as the test user
        response = requests.post(f"{BASE_URL}/api/v1/agents", 
            headers={
                "Authorization": f"Bearer {test_user['token']}",
                "Content-Type": "application/json"
            },
            json={
                "name": f"TEST_Agent_{unique_id}",
                "description": "Test agent for admin actions"
            }
        )
        assert response.status_code == 201, f"Failed to create test agent: {response.text}"
        agent_data = response.json()
        
        yield {
            "agent_id": agent_data["agent_id"],
            "name": agent_data["name"],
            "description": agent_data.get("description"),
            "owner_id": test_user["id"]
        }
        
        # Cleanup: Try to delete the agent if it still exists
        try:
            requests.delete(f"{BASE_URL}/api/admin/agents/{agent_data['agent_id']}", headers=admin_headers)
        except:
            pass

    # ============== USER ROLE TOGGLE TESTS ==============
    
    def test_admin_make_user_admin(self, admin_headers, test_user):
        """Test promoting a regular user to admin"""
        user_id = test_user["id"]
        
        # Verify user is not admin initially
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["is_admin"] == False
        
        # Make user admin
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            headers=admin_headers,
            json={"is_admin": True}
        )
        assert response.status_code == 200, f"Failed to make user admin: {response.text}"
        data = response.json()
        assert data["is_admin"] == True
        assert data["id"] == user_id
        
        # Verify via GET
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["is_admin"] == True
        print(f"SUCCESS: User {user_id} promoted to admin")
    
    def test_admin_remove_admin_privileges(self, admin_headers, test_user):
        """Test removing admin privileges from a user"""
        user_id = test_user["id"]
        
        # First make user admin
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            headers=admin_headers,
            json={"is_admin": True}
        )
        assert response.status_code == 200
        
        # Now remove admin privileges
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{user_id}/role",
            headers=admin_headers,
            json={"is_admin": False}
        )
        assert response.status_code == 200, f"Failed to remove admin: {response.text}"
        data = response.json()
        assert data["is_admin"] == False
        
        # Verify via GET
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["is_admin"] == False
        print(f"SUCCESS: Admin privileges removed from user {user_id}")
    
    def test_admin_cannot_demote_self(self, admin_headers, admin_user_id):
        """Test that admin cannot remove their own admin privileges"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{admin_user_id}/role",
            headers=admin_headers,
            json={"is_admin": False}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        assert "cannot remove your own admin" in data["error"]["message"].lower()
        print(f"SUCCESS: Admin cannot demote themselves - error: {data['error']['message']}")
    
    def test_toggle_role_nonexistent_user(self, admin_headers):
        """Test toggling role for non-existent user returns 404"""
        fake_user_id = "nonexistent-user-id-12345"
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{fake_user_id}/role",
            headers=admin_headers,
            json={"is_admin": True}
        )
        assert response.status_code == 404
        print("SUCCESS: 404 returned for non-existent user role toggle")

    # ============== USER DELETE TESTS ==============
    
    def test_admin_delete_user(self, admin_headers, test_user):
        """Test deleting a user"""
        user_id = test_user["id"]
        
        # Delete user
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{user_id}",
            headers=admin_headers
        )
        assert response.status_code == 204, f"Failed to delete user: {response.text}"
        
        # Verify user no longer exists
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert response.status_code == 404
        print(f"SUCCESS: User {user_id} deleted")
    
    def test_admin_cannot_delete_self(self, admin_headers, admin_user_id):
        """Test that admin cannot delete their own account"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{admin_user_id}",
            headers=admin_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "error" in data
        assert "cannot delete your own" in data["error"]["message"].lower()
        print(f"SUCCESS: Admin cannot delete themselves - error: {data['error']['message']}")
    
    def test_delete_nonexistent_user(self, admin_headers):
        """Test deleting non-existent user returns 404"""
        fake_user_id = "nonexistent-user-id-12345"
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{fake_user_id}",
            headers=admin_headers
        )
        assert response.status_code == 404
        print("SUCCESS: 404 returned for non-existent user delete")
    
    def test_delete_user_cascades_data(self, admin_headers):
        """Test that deleting a user cascades and removes all their data"""
        # Create a fresh test user
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_cascade_{unique_id}@test.com"
        
        # Signup
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": "TestPass123!"
        })
        assert response.status_code in [200, 201]
        user_data = response.json()
        user_id = user_data["user"]["id"]
        user_token = user_data["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        
        # Create an agent
        response = requests.post(f"{BASE_URL}/api/v1/agents", headers=user_headers, json={
            "name": f"TEST_CascadeAgent_{unique_id}"
        })
        assert response.status_code in [200, 201], f"Failed to create agent: {response.text}"
        agent_id = response.json()["agent_id"]
        
        # Add an outcome to the agent
        response = requests.post(f"{BASE_URL}/api/v1/agents/{agent_id}/outcomes", headers=user_headers, json={
            "result": "success",
            "task_type": "test_task",
            "submitter_type": "self"
        })
        assert response.status_code in [200, 201], f"Failed to create outcome: {response.text}"
        
        # Verify agent exists
        response = requests.get(f"{BASE_URL}/api/admin/agents/{agent_id}", headers=admin_headers)
        assert response.status_code == 200
        
        # Delete the user
        response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert response.status_code == 204
        
        # Verify agent is also deleted (cascade)
        response = requests.get(f"{BASE_URL}/api/admin/agents/{agent_id}", headers=admin_headers)
        assert response.status_code == 404, f"Agent should be deleted with user, got {response.status_code}"
        
        print(f"SUCCESS: User delete cascaded - agent {agent_id} also deleted")

    # ============== AGENT UPDATE TESTS ==============
    
    def test_admin_update_agent_name(self, admin_headers, test_agent):
        """Test updating an agent's name"""
        agent_id = test_agent["agent_id"]
        new_name = f"Updated_Agent_{uuid.uuid4().hex[:6]}"
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/agents/{agent_id}",
            headers=admin_headers,
            json={"name": new_name}
        )
        assert response.status_code == 200, f"Failed to update agent: {response.text}"
        data = response.json()
        assert data["name"] == new_name
        assert data["agent_id"] == agent_id
        
        # Verify via GET
        response = requests.get(f"{BASE_URL}/api/admin/agents/{agent_id}", headers=admin_headers)
        assert response.status_code == 200
        assert response.json()["name"] == new_name
        print(f"SUCCESS: Agent name updated to {new_name}")
    
    def test_admin_update_agent_description(self, admin_headers, test_agent):
        """Test updating an agent's description"""
        agent_id = test_agent["agent_id"]
        new_description = f"Updated description at {uuid.uuid4().hex[:6]}"
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/agents/{agent_id}",
            headers=admin_headers,
            json={"description": new_description}
        )
        assert response.status_code == 200, f"Failed to update agent: {response.text}"
        data = response.json()
        assert data["description"] == new_description
        
        print(f"SUCCESS: Agent description updated")
    
    def test_admin_update_agent_both_fields(self, admin_headers, test_agent):
        """Test updating both name and description"""
        agent_id = test_agent["agent_id"]
        new_name = f"BothUpdated_{uuid.uuid4().hex[:6]}"
        new_description = "Both fields updated"
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/agents/{agent_id}",
            headers=admin_headers,
            json={"name": new_name, "description": new_description}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == new_name
        assert data["description"] == new_description
        print(f"SUCCESS: Both agent name and description updated")
    
    def test_admin_update_agent_no_fields(self, admin_headers, test_agent):
        """Test updating agent with no fields returns error"""
        agent_id = test_agent["agent_id"]
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/agents/{agent_id}",
            headers=admin_headers,
            json={}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: 400 returned when no fields provided for update")
    
    def test_update_nonexistent_agent(self, admin_headers):
        """Test updating non-existent agent returns 404"""
        fake_agent_id = "nonexistent-agent-id-12345"
        response = requests.patch(
            f"{BASE_URL}/api/admin/agents/{fake_agent_id}",
            headers=admin_headers,
            json={"name": "New Name"}
        )
        assert response.status_code == 404
        print("SUCCESS: 404 returned for non-existent agent update")

    # ============== AGENT DELETE TESTS ==============
    
    def test_admin_delete_agent(self, admin_headers, test_user):
        """Test deleting an agent"""
        # Create a fresh agent for this test
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/v1/agents", 
            headers={
                "Authorization": f"Bearer {test_user['token']}",
                "Content-Type": "application/json"
            },
            json={
                "name": f"TEST_DeleteAgent_{unique_id}",
                "description": "Agent to be deleted"
            }
        )
        assert response.status_code == 201
        agent_id = response.json()["agent_id"]
        
        # Delete agent
        response = requests.delete(
            f"{BASE_URL}/api/admin/agents/{agent_id}",
            headers=admin_headers
        )
        assert response.status_code == 204, f"Failed to delete agent: {response.text}"
        
        # Verify agent no longer exists
        response = requests.get(f"{BASE_URL}/api/admin/agents/{agent_id}", headers=admin_headers)
        assert response.status_code == 404
        print(f"SUCCESS: Agent {agent_id} deleted")
    
    def test_delete_nonexistent_agent(self, admin_headers):
        """Test deleting non-existent agent returns 404"""
        fake_agent_id = "nonexistent-agent-id-12345"
        response = requests.delete(
            f"{BASE_URL}/api/admin/agents/{fake_agent_id}",
            headers=admin_headers
        )
        assert response.status_code == 404
        print("SUCCESS: 404 returned for non-existent agent delete")

    # ============== AUTHORIZATION TESTS ==============
    
    def test_non_admin_cannot_toggle_role(self, test_user):
        """Test that non-admin users cannot toggle user roles"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user['id']}/role",
            headers={
                "Authorization": f"Bearer {test_user['token']}",
                "Content-Type": "application/json"
            },
            json={"is_admin": True}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("SUCCESS: Non-admin cannot toggle user roles")
    
    def test_non_admin_cannot_delete_user(self, test_user):
        """Test that non-admin users cannot delete users"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/users/{test_user['id']}",
            headers={
                "Authorization": f"Bearer {test_user['token']}"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("SUCCESS: Non-admin cannot delete users")
    
    def test_non_admin_cannot_update_agent(self, test_user, test_agent):
        """Test that non-admin users cannot use admin agent update"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/agents/{test_agent['agent_id']}",
            headers={
                "Authorization": f"Bearer {test_user['token']}",
                "Content-Type": "application/json"
            },
            json={"name": "Hacked Name"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("SUCCESS: Non-admin cannot use admin agent update")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
