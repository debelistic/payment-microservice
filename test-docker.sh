#!/bin/bash

echo "🐳 Testing Docker Build for Payment Microservice"
echo "================================================"

# Build the Docker image
echo "Building Docker image..."
docker build -t payment-microservice-test .

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi

echo "✅ Docker image built successfully"

# Run the container
echo "Starting container..."
docker run -d --name payment-test -p 3667:3667 -e NODE_ENV=production payment-microservice-test

if [ $? -ne 0 ]; then
    echo "❌ Failed to start container"
    exit 1
fi

echo "✅ Container started successfully"

# Wait for the service to be ready
echo "Waiting for service to be ready..."
sleep 10

# Test health endpoint
echo "Testing health endpoint..."
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3667/health)

if [ "$response" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed (HTTP $response)"
fi

# Test API endpoint
echo "Testing API endpoint..."
api_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3667/api/v1/payments)

if [ "$api_response" = "200" ]; then
    echo "✅ API endpoint accessible"
else
    echo "❌ API endpoint failed (HTTP $api_response)"
fi

# Cleanup
echo "Cleaning up..."
docker stop payment-test
docker rm payment-test

echo "🎉 Docker test completed!"
