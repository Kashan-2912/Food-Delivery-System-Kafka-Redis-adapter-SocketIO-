const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'food-delivery-app',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'food-delivery-group' });

const connectKafkaProducer = async () => {
  try {
    await producer.connect();
    console.log('Kafka Producer Connected');
  } catch (error) {
    console.error('Kafka Producer Connection Error:', error);
    throw error;
  }
};

const connectKafkaConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka Consumer Connected');
  } catch (error) {
    console.error('Kafka Consumer Connection Error:', error);
    throw error;
  }
};

module.exports = {
  kafka,
  producer,
  consumer,
  connectKafkaProducer,
  connectKafkaConsumer
};

