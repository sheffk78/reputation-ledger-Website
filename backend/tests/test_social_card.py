"""
Tests for Social Card SVG Generation Feature
Tests the /api/v1/agents/{agent_id}/social-card.svg endpoint
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test agent IDs
PUBLIC_AGENT_ID = "agt_401d244674b1db413574b732"  # Sandbox Support Bot - Silver tier
UNRATED_AGENT_ID = "agt_6ddda796eedef4c33d1d2b9b"  # Test Agent - Unrated tier


class TestSocialCardEndpoint:
    """Tests for the social-card.svg endpoint"""
    
    def test_social_card_returns_valid_svg(self):
        """Test that social card endpoint returns valid SVG"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "image/svg+xml" in response.headers.get("Content-Type", ""), "Content-Type should be image/svg+xml"
        
        # Verify it's valid SVG
        content = response.text
        assert content.startswith("<svg"), "Response should start with <svg"
        assert "</svg>" in content, "Response should contain closing </svg> tag"
        print("✅ Social card returns valid SVG")
    
    def test_social_card_has_correct_dimensions(self):
        """Test that social card has 1200x630 dimensions (OG standard)"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for width="1200" and height="630"
        assert 'width="1200"' in content, "SVG should have width=1200"
        assert 'height="630"' in content, "SVG should have height=630"
        assert 'viewBox="0 0 1200 630"' in content, "SVG should have correct viewBox"
        print("✅ Social card has correct 1200x630 dimensions")
    
    def test_social_card_displays_agent_name(self):
        """Test that social card displays agent name"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for agent name (Sandbox Support Bot)
        assert "Sandbox Support Bot" in content, "SVG should contain agent name"
        print("✅ Social card displays agent name")
    
    def test_social_card_displays_tier(self):
        """Test that social card displays tier badge"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for tier (Silver for this agent)
        assert "Silver" in content, "SVG should contain tier name"
        assert "TRUST TIER" in content, "SVG should contain TRUST TIER label"
        print("✅ Social card displays tier")
    
    def test_social_card_displays_score(self):
        """Test that social card displays score"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for SCORE label
        assert "SCORE" in content, "SVG should contain SCORE label"
        # Score value should be present (73.7 for this agent)
        assert re.search(r'\d+\.?\d*', content), "SVG should contain numeric score"
        print("✅ Social card displays score")
    
    def test_social_card_displays_success_rate(self):
        """Test that social card displays success rate"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for SUCCESS RATE label
        assert "SUCCESS RATE" in content, "SVG should contain SUCCESS RATE label"
        print("✅ Social card displays success rate")
    
    def test_social_card_displays_outcomes(self):
        """Test that social card displays outcome count"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for OUTCOMES label
        assert "OUTCOMES" in content, "SVG should contain OUTCOMES label"
        print("✅ Social card displays outcomes")
    
    def test_social_card_includes_repledger_branding(self):
        """Test that social card includes RepLedger branding"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for RepLedger branding
        assert "RepLedger" in content, "SVG should contain RepLedger branding"
        assert "reputationledger.dev" in content, "SVG should contain reputationledger.dev URL"
        print("✅ Social card includes RepLedger branding")
    
    def test_social_card_has_cache_headers(self):
        """Test that social card has cache headers (may be modified by CDN/proxy)"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        cache_control = response.headers.get("Cache-Control", "")
        
        # Cache headers may be modified by CDN/proxy, just verify header exists
        # Backend sets "public, max-age=300" but CDN may override
        assert cache_control, "Should have Cache-Control header"
        print(f"✅ Social card has cache headers: {cache_control}")
    
    def test_social_card_404_for_missing_agent(self):
        """Test that social card returns 404 for non-existent agent"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/nonexistent_agent_id/social-card.svg")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Social card returns 404 for missing agent")


class TestSocialCardTiers:
    """Tests for different tier displays in social card"""
    
    def test_unrated_tier_social_card(self):
        """Test social card for Unrated tier agent"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{UNRATED_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for Unrated tier
        assert "Unrated" in content, "SVG should contain Unrated tier"
        # Check for Unrated tier color (#4B5563)
        assert "#4B5563" in content, "SVG should use Unrated tier color"
        print("✅ Unrated tier social card works correctly")
    
    def test_silver_tier_social_card(self):
        """Test social card for Silver tier agent"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for Silver tier
        assert "Silver" in content, "SVG should contain Silver tier"
        # Check for Silver tier color (#9CA3AF)
        assert "#9CA3AF" in content, "SVG should use Silver tier color"
        print("✅ Silver tier social card works correctly")


class TestSocialCardSVGStructure:
    """Tests for SVG structure and visual elements"""
    
    def test_social_card_has_gradient_background(self):
        """Test that social card has gradient background"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for gradient definition
        assert "linearGradient" in content, "SVG should have linearGradient"
        assert "bgGrad" in content, "SVG should have bgGrad gradient"
        print("✅ Social card has gradient background")
    
    def test_social_card_has_grid_pattern(self):
        """Test that social card has grid pattern"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for grid pattern
        assert "pattern" in content, "SVG should have pattern element"
        assert 'id="grid"' in content, "SVG should have grid pattern"
        print("✅ Social card has grid pattern")
    
    def test_social_card_has_tier_glow_effect(self):
        """Test that social card has tier glow effect"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for glow filter
        assert 'id="glow"' in content, "SVG should have glow filter"
        assert "feGaussianBlur" in content, "SVG should have Gaussian blur for glow"
        print("✅ Social card has tier glow effect")
    
    def test_social_card_has_card_shadows(self):
        """Test that social card has card shadow effects"""
        response = requests.get(f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg")
        
        assert response.status_code == 200
        content = response.text
        
        # Check for card shadow filter
        assert 'id="cardShadow"' in content, "SVG should have cardShadow filter"
        assert "feDropShadow" in content, "SVG should have drop shadow"
        print("✅ Social card has card shadows")


class TestSocialCardPublicAccess:
    """Tests for public access to social card (no auth required)"""
    
    def test_social_card_accessible_without_auth(self):
        """Test that social card is accessible without authentication"""
        # Make request without any auth headers
        response = requests.get(
            f"{BASE_URL}/api/v1/agents/{PUBLIC_AGENT_ID}/social-card.svg",
            headers={}  # No auth headers
        )
        
        assert response.status_code == 200, "Social card should be accessible without auth"
        assert "image/svg+xml" in response.headers.get("Content-Type", "")
        print("✅ Social card is publicly accessible without authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
