const { producer, connectKafkaProducer } = require('../config/kafka');

let isConnected = false;

// Initialize Kafka producer
const initProducer = async () => {
  try {
    if (!isConnected) {
      await connectKafkaProducer();
      isConnected = true;
    }
  } catch (error) {
    console.error('Failed to initialize Kafka producer:', error);
    isConnected = false;
  }
};

// Publish order event to Kafka
const publishOrderEvent = async (event) => {
  try {
    if (!isConnected) {
      await initProducer();
    }

    const message = {
      key: event.tenantId, // Partition by tenant ID
      value: JSON.stringify(event),
      headers: {
        'event-type': event.eventType,
        'tenant-id': event.tenantId,
      },
    };

    await producer.send({
      topic: 'order-events',
      messages: [message],
    });

    console.log(`Published ${event.eventType} event for tenant ${event.tenantId}`);
  } catch (error) {
    console.error('Error publishing order event:', error);
    // Don't throw error to prevent request failure
    // Just log it for monitoring
  }
};

// Graceful shutdown
const disconnectProducer = async () => {
  try {
    if (isConnected) {
      await producer.disconnect();
      isConnected = false;
      console.log('Kafka producer disconnected');
    }
  } catch (error) {
    console.error('Error disconnecting Kafka producer:', error);
  }
};

module.exports = {
  initProducer,
  publishOrderEvent,
  disconnectProducer,
};

