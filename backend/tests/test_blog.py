"""
Blog API Tests for RepLedger
Tests admin blog endpoints and public blog endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "support@agentictrust.app"
ADMIN_PASSWORD = "RepLedger2026!"
ADMIN_API_KEY = os.environ.get('ADMIN_API_KEY', 'arl_admin_1765a7b0c9403099147ada1d4586b2c047e7f6d87f52f31fd62714a3102c100b')


class TestBlogPublicEndpoints:
    """Test public blog endpoints (no auth required)"""
    
    def test_list_published_posts(self):
        """GET /api/blog/posts - List published posts"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert isinstance(data["posts"], list)
        print(f"✓ GET /api/blog/posts - Found {data['total']} published posts")
    
    def test_get_published_post_by_slug(self):
        """GET /api/blog/posts/:slug - Get published post by slug"""
        # First get list of posts to find a valid slug
        list_response = requests.get(f"{BASE_URL}/api/blog/posts")
        assert list_response.status_code == 200
        
        posts = list_response.json()["posts"]
        if len(posts) == 0:
            pytest.skip("No published posts available to test")
        
        slug = posts[0]["slug"]
        response = requests.get(f"{BASE_URL}/api/blog/posts/{slug}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["slug"] == slug
        assert "title" in data
        assert "content" in data
        assert "excerpt" in data
        assert "author" in data
        assert "tags" in data
        assert "reading_time" in data
        assert "meta_title" in data
        assert "meta_description" in data
        print(f"✓ GET /api/blog/posts/{slug} - Post retrieved with all fields")
    
    def test_get_nonexistent_post_returns_404(self):
        """GET /api/blog/posts/:slug - Returns 404 for non-existent slug"""
        response = requests.get(f"{BASE_URL}/api/blog/posts/nonexistent-slug-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/blog/posts/nonexistent-slug - Returns 404")
    
    def test_rss_feed(self):
        """GET /api/blog/rss - Returns valid RSS XML"""
        response = requests.get(f"{BASE_URL}/api/blog/rss")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "application/rss+xml" in content_type or "application/xml" in content_type or "text/xml" in content_type, \
            f"Expected RSS content type, got {content_type}"
        
        # Check RSS structure
        content = response.text
        assert '<?xml version="1.0"' in content
        assert '<rss version="2.0"' in content
        assert '<channel>' in content
        assert '<title>RepLedger Blog</title>' in content
        print("✓ GET /api/blog/rss - Valid RSS feed returned")


class TestBlogAdminEndpoints:
    """Test admin blog endpoints (require auth)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        # Try JWT auth first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if login_response.status_code == 200:
            # API returns access_token, not token
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            # Fall back to API key
            self.headers = {"X-Admin-API-Key": ADMIN_API_KEY}
        
        self.test_post_id = None
    
    def test_admin_list_all_posts(self):
        """GET /api/admin/blog/posts - List all posts (including drafts)"""
        response = requests.get(f"{BASE_URL}/api/admin/blog/posts", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data
        assert "total" in data
        print(f"✓ GET /api/admin/blog/posts - Found {data['total']} total posts (including drafts)")
    
    def test_admin_create_blog_post(self):
        """POST /api/admin/blog/posts - Create a new blog post"""
        unique_id = uuid.uuid4().hex[:8]
        post_data = {
            "title": f"TEST_Blog Post {unique_id}",
            "content": "# Test Content\n\nThis is a **test** blog post with markdown content.\n\n- Item 1\n- Item 2\n- Item 3",
            "author": "Test Author",
            "tags": ["test", "automation"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/blog/posts",
            json=post_data,
            headers=self.headers
        )
        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["title"] == post_data["title"]
        assert data["author"] == post_data["author"]
        assert data["status"] == "draft"
        assert "slug" in data
        assert "excerpt" in data
        assert "reading_time" in data
        assert "word_count" in data
        
        # Store for cleanup
        self.__class__.created_post_id = data["id"]
        self.__class__.created_post_slug = data["slug"]
        print(f"✓ POST /api/admin/blog/posts - Created post {data['id']} with slug '{data['slug']}'")
    
    def test_admin_get_post_by_id(self):
        """GET /api/admin/blog/posts/:id - Get post by ID"""
        if not hasattr(self.__class__, 'created_post_id'):
            pytest.skip("No test post created")
        
        post_id = self.__class__.created_post_id
        response = requests.get(f"{BASE_URL}/api/admin/blog/posts/{post_id}", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == post_id
        print(f"✓ GET /api/admin/blog/posts/{post_id} - Post retrieved")
    
    def test_admin_publish_post(self):
        """POST /api/admin/blog/posts/:id/publish - Publish a draft post"""
        if not hasattr(self.__class__, 'created_post_id'):
            pytest.skip("No test post created")
        
        post_id = self.__class__.created_post_id
        response = requests.post(
            f"{BASE_URL}/api/admin/blog/posts/{post_id}/publish",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "published"
        assert data["published_at"] is not None
        print(f"✓ POST /api/admin/blog/posts/{post_id}/publish - Post published")
    
    def test_published_post_appears_in_public_list(self):
        """Verify published post appears in public list"""
        if not hasattr(self.__class__, 'created_post_slug'):
            pytest.skip("No test post created")
        
        slug = self.__class__.created_post_slug
        response = requests.get(f"{BASE_URL}/api/blog/posts/{slug}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["slug"] == slug
        print(f"✓ Published post '{slug}' is accessible via public API")
    
    def test_admin_update_post(self):
        """PATCH /api/admin/blog/posts/:id - Update a post"""
        if not hasattr(self.__class__, 'created_post_id'):
            pytest.skip("No test post created")
        
        post_id = self.__class__.created_post_id
        update_data = {
            "title": "TEST_Updated Blog Post Title",
            "tags": ["test", "updated"]
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/blog/posts/{post_id}",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == update_data["title"]
        assert "updated" in data["tags"]
        print(f"✓ PATCH /api/admin/blog/posts/{post_id} - Post updated")
    
    def test_admin_delete_post(self):
        """DELETE /api/admin/blog/posts/:id - Delete a post"""
        if not hasattr(self.__class__, 'created_post_id'):
            pytest.skip("No test post created")
        
        post_id = self.__class__.created_post_id
        response = requests.delete(
            f"{BASE_URL}/api/admin/blog/posts/{post_id}",
            headers=self.headers
        )
        assert response.status_code == 204, f"Expected 204, got {response.status_code}: {response.text}"
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/blog/posts/{post_id}", headers=self.headers)
        assert get_response.status_code == 404
        print(f"✓ DELETE /api/admin/blog/posts/{post_id} - Post deleted and verified")


class TestExistingBlogPost:
    """Test the existing blog post mentioned in the context"""
    
    def test_existing_post_introduction_to_agent_reputation(self):
        """Verify the existing test post is accessible"""
        slug = "introduction-to-agent-reputation"
        response = requests.get(f"{BASE_URL}/api/blog/posts/{slug}")
        
        if response.status_code == 404:
            print(f"⚠ Post '{slug}' not found - may have been deleted or not created")
            pytest.skip("Existing test post not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["slug"] == slug
        assert "title" in data
        assert "content" in data
        assert "author" in data
        assert "reading_time" in data
        print(f"✓ Existing post '{slug}' is accessible with all required fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
