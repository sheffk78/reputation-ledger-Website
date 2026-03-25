"""
Test suite for standardized error format and validation
Tests: Error codes, messages, field-level validation, inline error details
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://rep-ledger-mvp.preview.emergentagent.com').rstrip('/')


class TestStandardizedErrorFormat:
    """Test that all errors follow the standardized format: {error: {code, message, details}}"""
    
    def test_login_wrong_password_returns_invalid_credentials(self):
        """POST /api/auth/login with wrong password returns INVALID_CREDENTIALS"""
        # First create a user
        unique_email = f"test_login_wrong_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "correctpassword123"
        })
        assert signup_response.status_code == 200, f"Signup failed: {signup_response.text}"
        
        # Now try to login with wrong password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        
        # Verify standardized error format
        assert "error" in data, "Response should have 'error' key"
        assert "code" in data["error"], "Error should have 'code'"
        assert "message" in data["error"], "Error should have 'message'"
        
        # Verify specific error code
        assert data["error"]["code"] == "INVALID_CREDENTIALS", f"Expected INVALID_CREDENTIALS, got {data['error']['code']}"
        assert "password" in data["error"]["message"].lower() or "credentials" in data["error"]["message"].lower()
        print(f"✓ Login with wrong password returns: {data['error']}")
    
    def test_signup_existing_email_returns_email_already_exists(self):
        """POST /api/auth/signup with existing email returns EMAIL_ALREADY_EXISTS"""
        # Create a user first
        unique_email = f"test_existing_{uuid.uuid4().hex[:8]}@example.com"
        first_signup = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert first_signup.status_code == 200, f"First signup failed: {first_signup.text}"
        
        # Try to signup again with same email
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "anotherpassword"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        
        # Verify standardized error format
        assert "error" in data, "Response should have 'error' key"
        assert data["error"]["code"] == "EMAIL_ALREADY_EXISTS", f"Expected EMAIL_ALREADY_EXISTS, got {data['error']['code']}"
        print(f"✓ Signup with existing email returns: {data['error']}")
    
    def test_get_agent_not_found_returns_agent_not_found_with_details(self):
        """GET /api/v1/agents/{fake_id} returns AGENT_NOT_FOUND with agent_id in details"""
        # First create a user and get token
        unique_email = f"test_agent_notfound_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        # Try to get a non-existent agent
        fake_agent_id = "agt_nonexistent123456"
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/{fake_agent_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        data = response.json()
        
        # Verify standardized error format
        assert "error" in data, "Response should have 'error' key"
        assert data["error"]["code"] == "AGENT_NOT_FOUND", f"Expected AGENT_NOT_FOUND, got {data['error']['code']}"
        
        # Verify details contains agent_id
        assert "details" in data["error"], "Error should have 'details'"
        assert "agent_id" in data["error"]["details"], "Details should contain 'agent_id'"
        assert data["error"]["details"]["agent_id"] == fake_agent_id
        print(f"✓ Get non-existent agent returns: {data['error']}")
    
    def test_create_webhook_invalid_url_returns_invalid_url(self):
        """POST /api/v1/webhooks with invalid URL returns INVALID_URL"""
        # First create a user and get token
        unique_email = f"test_webhook_url_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        # Try to create webhook with invalid URL (no http/https)
        response = requests.post(
            f"{BASE_URL}/api/v1/webhooks",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": "not-a-valid-url.com/webhook",
                "events": ["outcome.created"]
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        
        # Verify standardized error format
        assert "error" in data, "Response should have 'error' key"
        assert data["error"]["code"] == "INVALID_URL", f"Expected INVALID_URL, got {data['error']['code']}"
        print(f"✓ Create webhook with invalid URL returns: {data['error']}")


class TestValidationErrors:
    """Test Pydantic validation errors with field-specific messages"""
    
    def test_signup_invalid_email_format(self):
        """Signup with invalid email format returns validation error"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": "not-an-email",
            "password": "password123"
        })
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        # Verify standardized error format
        assert "error" in data, "Response should have 'error' key"
        assert data["error"]["code"] == "VALIDATION_ERROR", f"Expected VALIDATION_ERROR, got {data['error']['code']}"
        
        # Verify field-level error
        assert "details" in data["error"], "Error should have 'details'"
        assert "fields" in data["error"]["details"], "Details should have 'fields'"
        assert "email" in data["error"]["details"]["fields"], "Fields should contain 'email'"
        print(f"✓ Invalid email format returns: {data['error']}")
    
    def test_signup_short_password(self):
        """Signup with short password returns validation error"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "12345"  # Less than 6 characters
        })
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        # Verify standardized error format
        assert "error" in data, "Response should have 'error' key"
        assert data["error"]["code"] == "VALIDATION_ERROR"
        
        # Verify field-level error for password
        assert "details" in data["error"]
        assert "fields" in data["error"]["details"]
        assert "password" in data["error"]["details"]["fields"]
        assert "6" in data["error"]["details"]["fields"]["password"]  # Should mention minimum length
        print(f"✓ Short password returns: {data['error']}")
    
    def test_signup_missing_email(self):
        """Signup with missing email returns validation error"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "password": "password123"
        })
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
        assert "fields" in data["error"]["details"]
        assert "email" in data["error"]["details"]["fields"]
        print(f"✓ Missing email returns: {data['error']}")
    
    def test_signup_missing_password(self):
        """Signup with missing password returns validation error"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com"
        })
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
        assert "fields" in data["error"]["details"]
        assert "password" in data["error"]["details"]["fields"]
        print(f"✓ Missing password returns: {data['error']}")
    
    def test_create_agent_missing_name(self):
        """Create agent with missing name returns validation error"""
        # First create a user and get token
        unique_email = f"test_agent_name_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        # Try to create agent without name
        response = requests.post(
            f"{BASE_URL}/api/v1/agents",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "description": "Test agent without name"
            }
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
        assert "fields" in data["error"]["details"]
        assert "name" in data["error"]["details"]["fields"]
        print(f"✓ Missing agent name returns: {data['error']}")
    
    def test_create_agent_empty_name(self):
        """Create agent with empty name returns validation error"""
        # First create a user and get token
        unique_email = f"test_agent_empty_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        # Try to create agent with empty name
        response = requests.post(
            f"{BASE_URL}/api/v1/agents",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": ""
            }
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        print(f"✓ Empty agent name returns: {data['error']}")


class TestAuthenticationErrors:
    """Test authentication-related error codes"""
    
    def test_missing_token_returns_missing_token(self):
        """Request without token returns MISSING_TOKEN"""
        response = requests.get(f"{BASE_URL}/api/v1/agents")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "MISSING_TOKEN"
        print(f"✓ Missing token returns: {data['error']}")
    
    def test_invalid_token_returns_token_invalid(self):
        """Request with invalid token returns TOKEN_INVALID"""
        response = requests.get(
            f"{BASE_URL}/api/v1/agents",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        # Could be TOKEN_INVALID or INVALID_API_KEY depending on implementation
        assert data["error"]["code"] in ["TOKEN_INVALID", "INVALID_API_KEY"]
        print(f"✓ Invalid token returns: {data['error']}")


class TestWebhookValidation:
    """Test webhook-specific validation errors"""
    
    def test_webhook_duplicate_url_returns_duplicate_webhook_url(self):
        """Creating webhook with duplicate URL returns DUPLICATE_WEBHOOK_URL"""
        # First create a user and get token
        unique_email = f"test_webhook_dup_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        webhook_url = f"https://example.com/webhook/{uuid.uuid4().hex[:8]}"
        
        # Create first webhook
        first_response = requests.post(
            f"{BASE_URL}/api/v1/webhooks",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": webhook_url,
                "events": ["outcome.created"]
            }
        )
        assert first_response.status_code == 201, f"First webhook creation failed: {first_response.text}"
        
        # Try to create duplicate
        response = requests.post(
            f"{BASE_URL}/api/v1/webhooks",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": webhook_url,
                "events": ["outcome.created"]
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "DUPLICATE_WEBHOOK_URL"
        print(f"✓ Duplicate webhook URL returns: {data['error']}")
    
    def test_webhook_invalid_event_type(self):
        """Creating webhook with invalid event type returns error"""
        # First create a user and get token
        unique_email = f"test_webhook_event_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        # Try to create webhook with invalid event
        response = requests.post(
            f"{BASE_URL}/api/v1/webhooks",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "url": f"https://example.com/webhook/{uuid.uuid4().hex[:8]}",
                "events": ["invalid.event.type"]
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "INVALID_ENUM_VALUE"
        print(f"✓ Invalid event type returns: {data['error']}")


class TestOutcomeValidation:
    """Test outcome-specific validation errors"""
    
    def test_outcome_invalid_result_value(self):
        """Creating outcome with invalid result returns validation error"""
        # First create a user and agent
        unique_email = f"test_outcome_result_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        # Create an agent
        agent_response = requests.post(
            f"{BASE_URL}/api/v1/agents",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Test Agent"}
        )
        assert agent_response.status_code == 201
        agent_id = agent_response.json()["agent_id"]
        
        # Try to create outcome with invalid result
        response = requests.post(
            f"{BASE_URL}/api/v1/agents/{agent_id}/outcomes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "result": "invalid_result",  # Should be success/failure/partial/timeout
                "task_type": "test-task",
                "submitter_type": "self"
            }
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
        assert "fields" in data["error"]["details"]
        assert "result" in data["error"]["details"]["fields"]
        print(f"✓ Invalid outcome result returns: {data['error']}")
    
    def test_outcome_invalid_submitter_type(self):
        """Creating outcome with invalid submitter_type returns validation error"""
        # First create a user and agent
        unique_email = f"test_outcome_submitter_{uuid.uuid4().hex[:8]}@example.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": unique_email,
            "password": "password123"
        })
        assert signup_response.status_code == 200
        token = signup_response.json()["access_token"]
        
        # Create an agent
        agent_response = requests.post(
            f"{BASE_URL}/api/v1/agents",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "Test Agent"}
        )
        assert agent_response.status_code == 201
        agent_id = agent_response.json()["agent_id"]
        
        # Try to create outcome with invalid submitter_type
        response = requests.post(
            f"{BASE_URL}/api/v1/agents/{agent_id}/outcomes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "result": "success",
                "task_type": "test-task",
                "submitter_type": "invalid_type"  # Should be self/operator
            }
        )
        
        assert response.status_code == 422, f"Expected 422, got {response.status_code}"
        data = response.json()
        
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
        assert "fields" in data["error"]["details"]
        assert "submitter_type" in data["error"]["details"]["fields"]
        print(f"✓ Invalid submitter_type returns: {data['error']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
