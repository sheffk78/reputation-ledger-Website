"""
Test suite for Feedback and Client Events (Analytics) features
Tests:
- POST /api/feedback - Submit user feedback
- POST /api/client-events - Log client-side events
- GET /api/admin/feedback - Admin view of all feedback (paginated)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "support@agentictrust.app"
ADMIN_PASSWORD = "RepLedger2026!"

# Test user for non-admin tests
TEST_USER_EMAIL = f"test_feedback_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "TestPassword123!"


class TestSetup:
    """Setup fixtures for tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def test_user_token(self):
        """Create test user and get token"""
        # Try to signup
        signup_response = requests.post(
            f"{BASE_URL}/api/auth/signup",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        
        if signup_response.status_code == 201:
            return signup_response.json()["access_token"]
        
        # If user exists, login
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
        )
        assert login_response.status_code == 200, f"Test user login failed: {login_response.text}"
        return login_response.json()["access_token"]


class TestFeedbackSubmission(TestSetup):
    """Tests for POST /api/feedback endpoint"""
    
    def test_submit_feedback_success(self, test_user_token):
        """Test submitting feedback with valid message"""
        response = requests.post(
            f"{BASE_URL}/api/feedback",
            json={"message": "This is test feedback from automated tests"},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain 'id'"
        assert "message" in data, "Response should contain 'message'"
        assert "user_email" in data, "Response should contain 'user_email'"
        assert "created_at" in data, "Response should contain 'created_at'"
        
        # Verify data values
        assert data["message"] == "This is test feedback from automated tests"
        assert data["user_email"] == TEST_USER_EMAIL
        print(f"✓ Feedback submitted successfully with id: {data['id']}")
    
    def test_submit_feedback_with_email_override(self, test_user_token):
        """Test submitting feedback with different email"""
        override_email = "override@example.com"
        response = requests.post(
            f"{BASE_URL}/api/feedback",
            json={
                "message": "Feedback with email override",
                "email": override_email
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify email override is stored
        assert data["email_override"] == override_email
        print(f"✓ Feedback with email override submitted successfully")
    
    def test_submit_feedback_empty_message_fails(self, test_user_token):
        """Test that empty message is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/feedback",
            json={"message": ""},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        # Should fail validation (422 Unprocessable Entity)
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("✓ Empty message correctly rejected")
    
    def test_submit_feedback_no_auth_fails(self):
        """Test that unauthenticated request fails"""
        response = requests.post(
            f"{BASE_URL}/api/feedback",
            json={"message": "Unauthorized feedback attempt"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Unauthenticated request correctly rejected")
    
    def test_submit_feedback_long_message(self, test_user_token):
        """Test submitting feedback with long message (up to 5000 chars)"""
        long_message = "A" * 4000  # Within 5000 char limit
        response = requests.post(
            f"{BASE_URL}/api/feedback",
            json={"message": long_message},
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        assert len(data["message"]) == 4000
        print("✓ Long message feedback submitted successfully")


class TestClientEvents(TestSetup):
    """Tests for POST /api/client-events endpoint"""
    
    def test_log_dashboard_loaded_event(self, test_user_token):
        """Test logging dashboard.loaded event"""
        response = requests.post(
            f"{BASE_URL}/api/client-events",
            json={
                "event_name": "dashboard.loaded",
                "context": {}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain 'id'"
        assert "event_name" in data, "Response should contain 'event_name'"
        assert "created_at" in data, "Response should contain 'created_at'"
        
        assert data["event_name"] == "dashboard.loaded"
        print(f"✓ dashboard.loaded event logged with id: {data['id']}")
    
    def test_log_agent_created_event(self, test_user_token):
        """Test logging agent.created event with context"""
        response = requests.post(
            f"{BASE_URL}/api/client-events",
            json={
                "event_name": "agent.created",
                "context": {"agent_id": "agt_test123"}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["event_name"] == "agent.created"
        assert data["context"]["agent_id"] == "agt_test123"
        print("✓ agent.created event logged with context")
    
    def test_log_badge_copied_event(self, test_user_token):
        """Test logging badge.copied event"""
        response = requests.post(
            f"{BASE_URL}/api/client-events",
            json={
                "event_name": "badge.copied",
                "context": {}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["event_name"] == "badge.copied"
        print("✓ badge.copied event logged")
    
    def test_log_feedback_opened_event(self, test_user_token):
        """Test logging feedback.opened event"""
        response = requests.post(
            f"{BASE_URL}/api/client-events",
            json={
                "event_name": "feedback.opened",
                "context": {}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["event_name"] == "feedback.opened"
        print("✓ feedback.opened event logged")
    
    def test_log_feedback_submitted_event(self, test_user_token):
        """Test logging feedback.submitted event"""
        response = requests.post(
            f"{BASE_URL}/api/client-events",
            json={
                "event_name": "feedback.submitted",
                "context": {}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["event_name"] == "feedback.submitted"
        print("✓ feedback.submitted event logged")
    
    def test_log_event_empty_name_fails(self, test_user_token):
        """Test that empty event name is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/client-events",
            json={
                "event_name": "",
                "context": {}
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print("✓ Empty event name correctly rejected")
    
    def test_log_event_no_auth_fails(self):
        """Test that unauthenticated event logging fails"""
        response = requests.post(
            f"{BASE_URL}/api/client-events",
            json={
                "event_name": "test.event",
                "context": {}
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Unauthenticated event logging correctly rejected")


class TestAdminFeedbackViewer(TestSetup):
    """Tests for GET /api/admin/feedback endpoint"""
    
    def test_admin_get_feedback_list(self, admin_token):
        """Test admin can retrieve feedback list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "feedback" in data, "Response should contain 'feedback' list"
        assert "total" in data, "Response should contain 'total' count"
        assert "page" in data, "Response should contain 'page'"
        assert "limit" in data, "Response should contain 'limit'"
        
        assert isinstance(data["feedback"], list)
        assert isinstance(data["total"], int)
        print(f"✓ Admin retrieved feedback list: {data['total']} total items")
    
    def test_admin_feedback_pagination(self, admin_token):
        """Test pagination works correctly"""
        # Get first page
        response1 = requests.get(
            f"{BASE_URL}/api/admin/feedback?page=1&limit=5",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        assert data1["page"] == 1
        assert data1["limit"] == 5
        assert len(data1["feedback"]) <= 5
        print(f"✓ Pagination working: page 1 with limit 5")
    
    def test_admin_feedback_item_structure(self, admin_token):
        """Test feedback item has correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback?limit=1",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["feedback"]) > 0:
            item = data["feedback"][0]
            # Verify item structure
            assert "id" in item, "Feedback item should have 'id'"
            assert "user_email" in item, "Feedback item should have 'user_email'"
            assert "message" in item, "Feedback item should have 'message'"
            assert "created_at" in item, "Feedback item should have 'created_at'"
            print(f"✓ Feedback item structure verified")
        else:
            print("⚠ No feedback items to verify structure")
    
    def test_non_admin_cannot_access_feedback(self, test_user_token):
        """Test non-admin users cannot access feedback list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/feedback",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Non-admin correctly denied access to feedback list")
    
    def test_unauthenticated_cannot_access_feedback(self):
        """Test unauthenticated request fails"""
        response = requests.get(f"{BASE_URL}/api/admin/feedback")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Unauthenticated request correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
