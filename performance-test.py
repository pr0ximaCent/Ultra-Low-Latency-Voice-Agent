import asyncio
import websockets
import json
import time
import statistics
from typing import List

class PerformanceTest:
    def __init__(self, server_url: str = "ws://localhost:8000/ws"):
        self.server_url = server_url
        self.latencies: List[float] = []
        
    async def test_connection_speed(self) -> float:
        """Test connection establishment time"""
        start_time = time.time()
        
        try:
            async with websockets.connect(self.server_url) as websocket:
                await websocket.send(json.dumps({"type": "ping"}))
                response = await websocket.recv()
                
            end_time = time.time()
            return (end_time - start_time) * 1000  # Convert to milliseconds
            
        except Exception as e:
            print(f"Connection test failed: {e}")
            return float('inf')
    
    async def test_voice_latency(self, num_tests: int = 10) -> List[float]:
        """Test voice-to-voice latency"""
        latencies = []
        
        try:
            async with websockets.connect(self.server_url) as websocket:
                for i in range(num_tests):
                    # Send mock audio data
                    audio_data = [0] * 1024  # Mock audio frame
                    message = {
                        "type": "audio",
                        "data": audio_data,
                        "timestamp": time.time()
                    }
                    
                    start_time = time.time()
                    await websocket.send(json.dumps(message))
                    
                    # Wait for response
                    response = await websocket.recv()
                    end_time = time.time()
                    
                    latency = (end_time - start_time) * 1000
                    latencies.append(latency)
                    
                    print(f"Test {i+1}: {latency:.2f}ms")
                    await asyncio.sleep(0.1)  # Small delay between tests
                    
        except Exception as e:
            print(f"Voice latency test failed: {e}")
            
        return latencies
    
    async def test_form_operations(self) -> dict:
        """Test form operation speeds"""
        results = {}
        
        try:
            async with websockets.connect(self.server_url) as websocket:
                # Test form opening
                start_time = time.time()
                await websocket.send(json.dumps({
                    "type": "tool_call",
                    "tool": "open_form",
                    "args": {"form_type": "default"}
                }))
                
                response = await websocket.recv()
                form_open_time = (time.time() - start_time) * 1000
                results["form_open"] = form_open_time
                
                # Test field updates
                field_update_times = []
                fields = [
                    ("name", "John Smith"),
                    ("email", "john@example.com"),
                    ("phone", "555-1234")
                ]
                
                for field_name, value in fields:
                    start_time = time.time()
                    await websocket.send(json.dumps({
                        "type": "tool_call",
                        "tool": "update_form_field",
                        "args": {"field_name": field_name, "value": value}
                    }))
                    
                    response = await websocket.recv()
                    field_time = (time.time() - start_time) * 1000
                    field_update_times.append(field_time)
                
                results["field_updates"] = field_update_times
                results["avg_field_update"] = statistics.mean(field_update_times)
                
                # Test form submission
                start_time = time.time()
                await websocket.send(json.dumps({
                    "type": "tool_call",
                    "tool": "submit_form",
                    "args": {}
                }))
                
                response = await websocket.recv()
                submit_time = (time.time() - start_time) * 1000
                results["form_submit"] = submit_time
                
        except Exception as e:
            print(f"Form operations test failed: {e}")
            
        return results
    
    async def run_full_test(self) -> dict:
        """Run comprehensive performance test"""
        print("🚀 Starting Performance Tests...")
        print("=" * 50)
        
        # Test connection speed
        print("\n1. Testing Connection Speed...")
        connection_time = await self.test_connection_speed()
        print(f"   Connection time: {connection_time:.2f}ms")
        
        # Test voice latency
        print("\n2. Testing Voice Latency...")
        voice_latencies = await self.test_voice_latency()
        
        # Test form operations
        print("\n3. Testing Form Operations...")
        form_results = await self.test_form_operations()
        
        # Calculate statistics
        if voice_latencies:
            avg_latency = statistics.mean(voice_latencies)
            min_latency = min(voice_latencies)
            max_latency = max(voice_latencies)
            p95_latency = statistics.quantiles(voice_latencies, n=20)[18]  # 95th percentile
        else:
            avg_latency = min_latency = max_latency = p95_latency = 0
        
        results = {
            "connection_time": connection_time,
            "voice_latency": {
                "average": avg_latency,
                "minimum": min_latency,
                "maximum": max_latency,
                "p95": p95_latency,
                "all_results": voice_latencies
            },
            "form_operations": form_results,
            "requirements_met": {
                "sub_500ms_latency": avg_latency < 500,
                "sub_2s_connection": connection_time < 2000,
                "sub_1s_form_ops": form_results.get("avg_field_update", 0) < 1000
            }
        }
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 PERFORMANCE SUMMARY")
        print("=" * 50)
        print(f"Connection Time: {connection_time:.2f}ms")
        print(f"Average Voice Latency: {avg_latency:.2f}ms")
        print(f"95th Percentile Latency: {p95_latency:.2f}ms")
        print(f"Form Open Time: {form_results.get('form_open', 0):.2f}ms")
        print(f"Average Field Update: {form_results.get('avg_field_update', 0):.2f}ms")
        
        print("\n🎯 REQUIREMENTS CHECK:")
        req_met = results["requirements_met"]
        print(f"✅ Sub-500ms latency: {'PASS' if req_met['sub_500ms_latency'] else 'FAIL'}")
        print(f"✅ Sub-2s connection: {'PASS' if req_met['sub_2s_connection'] else 'FAIL'}")
        print(f"✅ Sub-1s form ops: {'PASS' if req_met['sub_1s_form_ops'] else 'FAIL'}")
        
        return results

async def main():
    tester = PerformanceTest()
    results = await tester.run_full_test()
    
    # Save results to file
    with open("performance_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Results saved to performance_results.json")

if __name__ == "__main__":
    asyncio.run(main())