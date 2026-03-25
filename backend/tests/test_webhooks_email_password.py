"""
Test suite for RepLedger new features:
- Webhook CRUD and triggering
- Password reset flow
- Email service (Postmark integration)
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials - unique per test run
TEST_EMAIL_PREFIX = f"test_{uuid.uuid4().hex[:8]}"


class TestHealthCheck:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health check passed")


class TestSignupWithWelcomeEmail:
    """Test signup endpoint which should trigger welcome email"""
    
    def test_signup_creates_user_and_triggers_email(self):
        """POST /api/auth/signup - should send welcome email"""
        email = f"{TEST_EMAIL_PREFIX}_signup@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": "testpass123"
        })
        
        assert response.status_code == 200, f"Signup failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == email.lower()
        assert "id" in data["user"]
        print(f"✓ Signup successful for {email}")
        print("  Note: Welcome email should be sent in background (check logs)")
        
        return data["access_token"], data["user"]["id"]


class TestPasswordReset:
    """Test password reset flow"""
    
    @pytest.fixture
    def test_user(self):
        """Create a test user for password reset tests"""
        email = f"{TEST_EMAIL_PREFIX}_pwreset@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": "originalpass123"
        })
        assert response.status_code == 200
        return email, "originalpass123"
    
    def test_password_reset_request_existing_user(self, test_user):
        """POST /api/auth/password-reset/request - should accept email and respond"""
        email, _ = test_user
        response = requests.post(f"{BASE_URL}/api/auth/password-reset/request", json={
            "email": email
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should always return success message to prevent email enumeration
        assert "reset link has been sent" in data["message"].lower() or "account exists" in data["message"].lower()
        print(f"✓ Password reset request accepted for {email}")
    
    def test_password_reset_request_nonexistent_user(self):
        """Password reset for non-existent user should still return success (security)"""
        response = requests.post(f"{BASE_URL}/api/auth/password-reset/request", json={
            "email": "nonexistent_user_12345@test.com"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Password reset request for non-existent user returns success (prevents enumeration)")
    
    def test_password_reset_confirm_invalid_token(self):
        """POST /api/auth/password-reset/confirm - should reject invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/password-reset/confirm", json={
            "token": "invalid_token_12345",
            "new_password": "newpassword123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
        print("✓ Invalid reset token correctly rejected")


class TestWebhookCRUD:
    """Test webhook CRUD operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Create a test user and return auth token"""
        email = f"{TEST_EMAIL_PREFIX}_webhook_{uuid.uuid4().hex[:4]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Return headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_create_webhook(self, auth_headers):
        """POST /api/v1/webhooks - create a webhook with URL and events"""
        response = requests.post(f"{BASE_URL}/api/v1/webhooks", 
            headers=auth_headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["outcome.created"],
                "description": "Test webhook"
            }
        )
        
        assert response.status_code == 201, f"Create webhook failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["url"] == "https://httpbin.org/post"
        assert data["events"] == ["outcome.created"]
        assert data["description"] == "Test webhook"
        assert data["is_active"] == True
        assert "created_at" in data
        print(f"✓ Webhook created with ID: {data['id']}")
        
        return data["id"]
    
    def test_list_webhooks(self, auth_headers):
        """GET /api/v1/webhooks - list user's webhooks"""
        # First create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["outcome.created"]
            }
        )
        assert create_response.status_code == 201
        
        # List webhooks
        response = requests.get(f"{BASE_URL}/api/v1/webhooks", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "webhooks" in data
        assert isinstance(data["webhooks"], list)
        assert len(data["webhooks"]) >= 1
        print(f"✓ Listed {len(data['webhooks'])} webhook(s)")
    
    def test_get_specific_webhook(self, auth_headers):
        """GET /api/v1/webhooks/{webhook_id} - get specific webhook"""
        # First create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["outcome.created"],
                "description": "Specific webhook test"
            }
        )
        assert create_response.status_code == 201
        webhook_id = create_response.json()["id"]
        
        # Get specific webhook
        response = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == webhook_id
        assert data["url"] == "https://httpbin.org/post"
        assert data["description"] == "Specific webhook test"
        print(f"✓ Retrieved webhook {webhook_id}")
    
    def test_get_nonexistent_webhook(self, auth_headers):
        """GET /api/v1/webhooks/{webhook_id} - should return 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/v1/webhooks/nonexistent-id-12345", headers=auth_headers)
        
        assert response.status_code == 404
        print("✓ Non-existent webhook returns 404")
    
    def test_delete_webhook(self, auth_headers):
        """DELETE /api/v1/webhooks/{webhook_id} - delete a webhook"""
        # First create a webhook
        create_response = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["outcome.created"]
            }
        )
        assert create_response.status_code == 201
        webhook_id = create_response.json()["id"]
        
        # Delete webhook
        response = requests.delete(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=auth_headers)
        
        assert response.status_code == 204
        print(f"✓ Webhook {webhook_id} deleted")
        
        # Verify it's gone (should return 404)
        get_response = requests.get(f"{BASE_URL}/api/v1/webhooks/{webhook_id}", headers=auth_headers)
        assert get_response.status_code == 404
        print("✓ Deleted webhook no longer accessible")
    
    def test_delete_nonexistent_webhook(self, auth_headers):
        """DELETE /api/v1/webhooks/{webhook_id} - should return 404 for non-existent"""
        response = requests.delete(f"{BASE_URL}/api/v1/webhooks/nonexistent-id-12345", headers=auth_headers)
        
        assert response.status_code == 404
        print("✓ Delete non-existent webhook returns 404")
    
    def test_create_webhook_invalid_url(self, auth_headers):
        """POST /api/v1/webhooks - should reject invalid URL"""
        response = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "not-a-valid-url",
                "events": ["outcome.created"]
            }
        )
        
        assert response.status_code == 400
        print("✓ Invalid URL correctly rejected")
    
    def test_create_webhook_invalid_event(self, auth_headers):
        """POST /api/v1/webhooks - should reject invalid event type"""
        response = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["invalid.event"]
            }
        )
        
        assert response.status_code == 400
        print("✓ Invalid event type correctly rejected")
    
    def test_create_duplicate_webhook_url(self, auth_headers):
        """POST /api/v1/webhooks - should reject duplicate URL"""
        # Create first webhook
        response1 = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["outcome.created"]
            }
        )
        assert response1.status_code == 201
        
        # Try to create duplicate
        response2 = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["outcome.created"]
            }
        )
        
        assert response2.status_code == 400
        assert "already registered" in response2.json()["detail"].lower()
        print("✓ Duplicate webhook URL correctly rejected")


class TestWebhookTrigger:
    """Test webhook triggering on outcome creation"""
    
    @pytest.fixture
    def setup_user_with_webhook(self):
        """Create user, agent, and webhook for trigger testing"""
        # Create user
        email = f"{TEST_EMAIL_PREFIX}_trigger_{uuid.uuid4().hex[:4]}@test.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": "testpass123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create webhook
        webhook_response = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=headers,
            json={
                "url": "https://httpbin.org/post",
                "events": ["outcome.created"],
                "description": "Trigger test webhook"
            }
        )
        assert webhook_response.status_code == 201
        webhook_id = webhook_response.json()["id"]
        
        # Create agent
        agent_response = requests.post(f"{BASE_URL}/api/v1/agents",
            headers=headers,
            json={
                "name": "Trigger Test Agent",
                "description": "Agent for webhook trigger testing"
            }
        )
        assert agent_response.status_code == 201
        agent_id = agent_response.json()["agent_id"]
        
        return headers, agent_id, webhook_id
    
    def test_outcome_triggers_webhook(self, setup_user_with_webhook):
        """POST /api/v1/agents/{agent_id}/outcomes - should trigger webhook delivery"""
        headers, agent_id, webhook_id = setup_user_with_webhook
        
        # Create outcome
        response = requests.post(f"{BASE_URL}/api/v1/agents/{agent_id}/outcomes",
            headers=headers,
            json={
                "result": "success",
                "task_type": "webhook_trigger_test",
                "submitter_type": "self"
            }
        )
        
        assert response.status_code == 201, f"Outcome creation failed: {response.text}"
        data = response.json()
        
        # Verify outcome response
        assert "id" in data
        assert data["agent_id"] == agent_id
        assert data["result"] == "success"
        assert data["task_type"] == "webhook_trigger_test"
        print(f"✓ Outcome created: {data['id']}")
        print("  Note: Webhook should be triggered in background (check logs for delivery)")
        
        # Give time for background task to complete
        time.sleep(2)
        
        return data["id"]


class TestWebhookAuthentication:
    """Test webhook endpoints require authentication"""
    
    def test_list_webhooks_requires_auth(self):
        """GET /api/v1/webhooks - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/v1/webhooks")
        assert response.status_code == 401
        print("✓ List webhooks requires authentication")
    
    def test_create_webhook_requires_auth(self):
        """POST /api/v1/webhooks - should require authentication"""
        response = requests.post(f"{BASE_URL}/api/v1/webhooks", json={
            "url": "https://httpbin.org/post",
            "events": ["outcome.created"]
        })
        assert response.status_code == 401
        print("✓ Create webhook requires authentication")
    
    def test_delete_webhook_requires_auth(self):
        """DELETE /api/v1/webhooks/{id} - should require authentication"""
        response = requests.delete(f"{BASE_URL}/api/v1/webhooks/some-id")
        assert response.status_code == 401
        print("✓ Delete webhook requires authentication")


class TestWebhookLimits:
    """Test webhook limits and constraints"""
    
    @pytest.fixture
    def auth_headers(self):
        """Create a test user and return auth headers"""
        email = f"{TEST_EMAIL_PREFIX}_limits_{uuid.uuid4().hex[:4]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_webhook_url_min_length(self, auth_headers):
        """Webhook URL must be at least 10 characters"""
        response = requests.post(f"{BASE_URL}/api/v1/webhooks",
            headers=auth_headers,
            json={
                "url": "http://a",  # Too short
                "events": ["outcome.created"]
            }
        )
        assert response.status_code == 422  # Validation error
        print("✓ Short URL correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
