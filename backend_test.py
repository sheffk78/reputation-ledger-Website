import requests
import sys
import json
from datetime import datetime

class RepLedgerAPITester:
    def __init__(self, base_url="https://rep-ledger-mvp.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.api_key = None
        self.user_id = None
        self.agent_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)
        
        if self.token and 'Authorization' not in default_headers:
            default_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success:
                try:
                    return response.json()
                except:
                    return response.text
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        self.run_test("API Root", "GET", "api/", 200)
        self.run_test("Health Check", "GET", "api/health", 200)

    def test_user_signup(self):
        """Test user signup"""
        print("\n🔍 Testing User Signup...")
        timestamp = datetime.now().strftime('%H%M%S')
        test_email = f"test_{timestamp}@example.com"
        test_password = "TestPass123!"
        
        response = self.run_test(
            "User Signup",
            "POST",
            "api/auth/signup",
            200,
            data={"email": test_email, "password": test_password}
        )
        
        if response:
            self.token = response.get('access_token')
            self.user_id = response.get('user', {}).get('id')
            print(f"   User ID: {self.user_id}")
            print(f"   Token: {self.token[:20]}...")
            return test_email, test_password
        return None, None

    def test_user_login(self, email, password):
        """Test user login"""
        print("\n🔍 Testing User Login...")
        response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if response:
            self.token = response.get('access_token')
            print(f"   Login Token: {self.token[:20]}...")

    def test_get_me(self):
        """Test get current user"""
        print("\n🔍 Testing Get Current User...")
        self.run_test("Get Me", "GET", "api/auth/me", 200)

    def test_api_key_management(self):
        """Test API key operations"""
        print("\n🔍 Testing API Key Management...")
        
        # Get API key
        response = self.run_test("Get API Key", "GET", "api/api-key", 200)
        if response:
            self.api_key = response.get('api_key')
            print(f"   API Key: {self.api_key[:20]}...")
        
        # Regenerate API key
        response = self.run_test("Regenerate API Key", "POST", "api/api-key/regenerate", 200)
        if response:
            new_api_key = response.get('api_key')
            print(f"   New API Key: {new_api_key[:20]}...")
            self.api_key = new_api_key

    def test_agent_creation(self):
        """Test agent creation"""
        print("\n🔍 Testing Agent Creation...")
        
        agent_data = {
            "name": "Test Agent",
            "description": "A test agent for API testing",
            "owner_handle": "@test-user"
        }
        
        response = self.run_test(
            "Create Agent",
            "POST",
            "api/v1/agents",
            201,
            data=agent_data
        )
        
        if response:
            self.agent_id = response.get('agent_id')
            print(f"   Agent ID: {self.agent_id}")
            
            # Verify response format per spec - should only have base fields
            expected_fields = {'agent_id', 'name', 'description', 'owner_handle', 'created_at'}
            actual_fields = set(response.keys())
            
            if actual_fields == expected_fields:
                self.log_test("POST /v1/agents Response Format", True, "Contains only base fields as per spec")
            else:
                extra_fields = actual_fields - expected_fields
                missing_fields = expected_fields - actual_fields
                details = f"Extra fields: {extra_fields}, Missing fields: {missing_fields}"
                self.log_test("POST /v1/agents Response Format", False, details)
            
            return self.agent_id
        return None

    def test_agent_listing(self):
        """Test agent listing with computed fields"""
        print("\n🔍 Testing Agent Listing...")
        response = self.run_test("List Agents", "GET", "api/v1/agents", 200)
        if response and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} agents")
            
            # Verify response format includes computed fields
            agent = response[0]
            expected_fields = {'agent_id', 'name', 'description', 'owner_handle', 'created_at', 'score', 'tier', 'outcome_count', 'success_rate'}
            actual_fields = set(agent.keys())
            
            if expected_fields.issubset(actual_fields):
                self.log_test("GET /v1/agents Response Format", True, "Contains all required fields including computed ones")
                print(f"   Agent: {agent['name']}, Score: {agent['score']}, Tier: {agent['tier']}, Outcomes: {agent['outcome_count']}")
            else:
                missing_fields = expected_fields - actual_fields
                details = f"Missing fields: {missing_fields}"
                self.log_test("GET /v1/agents Response Format", False, details)

    def test_agent_details(self):
        """Test getting agent details with computed fields"""
        if not self.agent_id:
            print("⚠️  Skipping agent details test - no agent ID")
            return
            
        print("\n🔍 Testing Agent Details...")
        response = self.run_test(f"Get Agent {self.agent_id}", "GET", f"api/v1/agents/{self.agent_id}", 200)
        
        if response:
            # Verify response format includes computed fields
            expected_fields = {'agent_id', 'name', 'description', 'owner_handle', 'created_at', 'score', 'tier', 'outcome_count', 'success_rate'}
            actual_fields = set(response.keys())
            
            if expected_fields.issubset(actual_fields):
                self.log_test("GET /v1/agents/{id} Response Format", True, "Contains all required fields including computed ones")
                print(f"   Agent Details: Score: {response['score']}, Tier: {response['tier']}, Outcomes: {response['outcome_count']}")
            else:
                missing_fields = expected_fields - actual_fields
                details = f"Missing fields: {missing_fields}"
                self.log_test("GET /v1/agents/{id} Response Format", False, details)

    def test_outcome_submission(self):
        """Test outcome submission with validation"""
        if not self.agent_id:
            print("⚠️  Skipping outcome submission test - no agent ID")
            return
            
        print("\n🔍 Testing Outcome Submission...")
        
        # Submit multiple outcomes to test scoring
        outcomes = [
            {"result": "success", "task_type": "data_processing", "submitter_type": "self"},
            {"result": "success", "task_type": "api_call", "submitter_type": "operator"},
            {"result": "failure", "task_type": "data_processing", "submitter_type": "self"},
            {"result": "success", "task_type": "analysis", "submitter_type": "self"},
            {"result": "success", "task_type": "report_generation", "submitter_type": "operator"},
            {"result": "success", "task_type": "data_validation", "submitter_type": "self"},
        ]
        
        for i, outcome in enumerate(outcomes):
            response = self.run_test(
                f"Submit Outcome {i+1}",
                "POST",
                f"api/v1/agents/{self.agent_id}/outcomes",
                201,
                data=outcome
            )
            
            # Validate response format
            if response:
                expected_fields = {'id', 'agent_id', 'result', 'task_type', 'submitter_type', 'created_at'}
                actual_fields = set(response.keys())
                
                if expected_fields == actual_fields:
                    self.log_test(f"Outcome {i+1} Response Format", True, "Contains all required fields")
                else:
                    missing_fields = expected_fields - actual_fields
                    extra_fields = actual_fields - expected_fields
                    details = f"Missing: {missing_fields}, Extra: {extra_fields}"
                    self.log_test(f"Outcome {i+1} Response Format", False, details)
        
        # Test invalid outcome data
        print("\n🔍 Testing Invalid Outcome Submission...")
        invalid_outcomes = [
            {"result": "invalid", "task_type": "test", "submitter_type": "self"},  # Invalid result
            {"result": "success", "task_type": "", "submitter_type": "self"},  # Empty task_type
            {"result": "success", "task_type": "test", "submitter_type": "invalid"},  # Invalid submitter_type
        ]
        
        for i, outcome in enumerate(invalid_outcomes):
            self.run_test(
                f"Submit Invalid Outcome {i+1}",
                "POST",
                f"api/v1/agents/{self.agent_id}/outcomes",
                422,  # Validation error
                data=outcome
            )

    def test_outcome_listing(self):
        """Test outcome listing"""
        if not self.agent_id:
            print("⚠️  Skipping outcome listing test - no agent ID")
            return
            
        print("\n🔍 Testing Outcome Listing...")
        response = self.run_test(
            "List Outcomes",
            "GET",
            f"api/v1/agents/{self.agent_id}/outcomes",
            200
        )
        if response and isinstance(response, list):
            print(f"   Found {len(response)} outcomes")

    def test_agent_score(self):
        """Test agent score calculation and tier logic"""
        if not self.agent_id:
            print("⚠️  Skipping agent score test - no agent ID")
            return
            
        print("\n🔍 Testing Agent Score...")
        response = self.run_test(
            "Get Agent Score",
            "GET",
            f"api/v1/agents/{self.agent_id}/score",
            200
        )
        if response:
            score = response.get('score')
            tier = response.get('tier')
            outcome_count = response.get('outcome_count')
            success_rate = response.get('success_rate')
            
            print(f"   Score: {score}")
            print(f"   Tier: {tier}")
            print(f"   Outcome Count: {outcome_count}")
            print(f"   Success Rate: {success_rate}%")
            
            # Validate score calculation (5 success out of 6 total = 83.3%)
            expected_score = round((5/6) * 100, 1)  # 83.3
            if abs(score - expected_score) < 0.1:
                self.log_test("Score Calculation", True, f"Score {score} matches expected {expected_score}")
            else:
                self.log_test("Score Calculation", False, f"Score {score} doesn't match expected {expected_score}")
            
            # Validate tier logic (83.3% with 6 outcomes should be Gold)
            expected_tier = "Gold"  # 75-89% range
            if tier == expected_tier:
                self.log_test("Tier Calculation", True, f"Tier {tier} matches expected {expected_tier}")
            else:
                self.log_test("Tier Calculation", False, f"Tier {tier} doesn't match expected {expected_tier}")
            
            # Validate response format
            expected_fields = {'agent_id', 'score', 'tier', 'outcome_count', 'success_rate'}
            actual_fields = set(response.keys())
            
            if expected_fields == actual_fields:
                self.log_test("Score Response Format", True, "Contains all required fields")
            else:
                missing_fields = expected_fields - actual_fields
                extra_fields = actual_fields - expected_fields
                details = f"Missing: {missing_fields}, Extra: {extra_fields}"
                self.log_test("Score Response Format", False, details)

    def test_badge_svg(self):
        """Test SVG badge generation (public endpoint)"""
        if not self.agent_id:
            print("⚠️  Skipping badge test - no agent ID")
            return
            
        print("\n🔍 Testing SVG Badge...")
        url = f"{self.base_url}/api/v1/agents/{self.agent_id}/badge.svg"
        
        try:
            # Test without auth (public endpoint)
            response = requests.get(url)
            success = response.status_code == 200 and 'svg' in response.text.lower()
            details = f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'unknown')}"
            
            self.log_test("Get SVG Badge (Public)", success, details)
            
            if success:
                print(f"   Badge SVG length: {len(response.text)} chars")
                
        except Exception as e:
            self.log_test("Get SVG Badge (Public)", False, f"Exception: {str(e)}")

    def test_api_with_api_key(self):
        """Test API endpoints using API key instead of JWT"""
        if not self.api_key:
            print("⚠️  Skipping API key auth test - missing API key")
            return
            
        print("\n🔍 Testing API Key Authentication...")
        
        # Test with API key instead of JWT token
        headers = {'Authorization': f'Bearer {self.api_key}'}
        
        # Temporarily clear JWT token to test API key
        old_token = self.token
        self.token = None
        
        response = self.run_test(
            "List Agents (API Key)",
            "GET",
            "api/v1/agents",
            200,
            headers=headers
        )
        
        # Test creating agent with API key
        agent_data = {
            "name": "API Key Test Agent",
            "description": "Agent created using API key auth",
            "owner_handle": "@api-test"
        }
        
        response = self.run_test(
            "Create Agent (API Key)",
            "POST",
            "api/v1/agents",
            201,
            data=agent_data,
            headers=headers
        )
        
        # Restore JWT token
        self.token = old_token

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting RepLedger API Tests...")
        print(f"Base URL: {self.base_url}")
        
        # Basic health checks
        self.test_health_check()
        
        # User authentication flow
        email, password = self.test_user_signup()
        if email and password:
            self.test_user_login(email, password)
            self.test_get_me()
            
            # API key management
            self.test_api_key_management()
            
            # Agent management with computed fields
            self.test_agent_creation()
            self.test_agent_listing()
            self.test_agent_details()
            
            # Outcome management and scoring
            self.test_outcome_submission()
            self.test_outcome_listing()
            self.test_agent_score()
            
            # Test updated agent listing with scores
            print("\n🔍 Re-testing Agent Listing with Scores...")
            self.test_agent_listing()
            
            # API key authentication for v1 endpoints
            self.test_api_with_api_key()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = RepLedgerAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())