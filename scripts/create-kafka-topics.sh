#!/bin/bash

# Create Kafka Topics Script
# Run this in your WSL environment where Kafka is installed

echo "Creating Kafka topics for Food Delivery System..."

# Navigate to Kafka directory (adjust path as needed)
# cd /path/to/kafka

# Create order-events topic
kafka-topics.sh --create \
  --topic order-events \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1 \
  --config retention.ms=604800000

echo "✅ Created topic: order-events (3 partitions)"

# List all topics to verify
echo "\n📋 Current Kafka topics:"
kafka-topics.sh --list --bootstrap-server localhost:9092

echo "\n✅ Kafka topics created successfully!"

