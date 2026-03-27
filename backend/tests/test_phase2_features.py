"""
Phase 2 Backend Tests - Feature Requests API
Tests for POST /api/feature-requests endpoint (public, no auth required)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFeatureRequestsAPI:
    """Tests for POST /api/feature-requests endpoint"""
    
    def test_submit_feature_request_with_all_fields(self):
        """Submit feature request with title, description, and email"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Feature Request {unique_id}",
            "description": f"This is a test feature request description for testing purposes. ID: {unique_id}",
            "email": f"test_{unique_id}@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["title"] == payload["title"], "Title should match"
        assert data["description"] == payload["description"], "Description should match"
        assert data["email"] == payload["email"], "Email should match"
        assert "created_at" in data, "Response should contain created_at"
        print(f"✓ Feature request created with ID: {data['id']}")
    
    def test_submit_feature_request_without_email(self):
        """Submit feature request without optional email field"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_No Email Request {unique_id}",
            "description": f"Feature request without email. ID: {unique_id}"
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["email"] is None, "Email should be null when not provided"
        print(f"✓ Feature request without email created: {data['id']}")
    
    def test_submit_feature_request_empty_title_rejected(self):
        """Empty title should be rejected"""
        payload = {
            "title": "",
            "description": "Valid description"
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for empty title, got {response.status_code}"
        print("✓ Empty title correctly rejected with 422")
    
    def test_submit_feature_request_empty_description_rejected(self):
        """Empty description should be rejected"""
        payload = {
            "title": "Valid Title",
            "description": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for empty description, got {response.status_code}"
        print("✓ Empty description correctly rejected with 422")
    
    def test_submit_feature_request_missing_title_rejected(self):
        """Missing title field should be rejected"""
        payload = {
            "description": "Valid description"
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for missing title, got {response.status_code}"
        print("✓ Missing title correctly rejected with 422")
    
    def test_submit_feature_request_missing_description_rejected(self):
        """Missing description field should be rejected"""
        payload = {
            "title": "Valid Title"
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for missing description, got {response.status_code}"
        print("✓ Missing description correctly rejected with 422")
    
    def test_submit_feature_request_invalid_email_rejected(self):
        """Invalid email format should be rejected"""
        payload = {
            "title": "Valid Title",
            "description": "Valid description",
            "email": "not-a-valid-email"
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print("✓ Invalid email correctly rejected with 422")
    
    def test_submit_feature_request_no_auth_required(self):
        """Feature request endpoint should work without authentication"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Public Request {unique_id}",
            "description": f"This request is submitted without auth. ID: {unique_id}"
        }
        
        # Explicitly NOT including any auth headers
        response = requests.post(
            f"{BASE_URL}/api/feature-requests", 
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 201, f"Expected 201 without auth, got {response.status_code}: {response.text}"
        print("✓ Feature request works without authentication (public endpoint)")
    
    def test_submit_feature_request_title_max_length(self):
        """Title should respect max length of 200 characters"""
        payload = {
            "title": "A" * 201,  # 201 characters, exceeds limit
            "description": "Valid description"
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for title exceeding max length, got {response.status_code}"
        print("✓ Title max length (200) correctly enforced")
    
    def test_submit_feature_request_description_max_length(self):
        """Description should respect max length of 2000 characters"""
        payload = {
            "title": "Valid Title",
            "description": "A" * 2001  # 2001 characters, exceeds limit
        }
        
        response = requests.post(f"{BASE_URL}/api/feature-requests", json=payload)
        
        assert response.status_code == 422, f"Expected 422 for description exceeding max length, got {response.status_code}"
        print("✓ Description max length (2000) correctly enforced")


class TestHealthAndBasicEndpoints:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Health endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
