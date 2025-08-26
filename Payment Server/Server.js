const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/payments', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Transaction schema
const transactionSchema = new mongoose.Schema({
  name: String,
  email: String,
  amount: Number,
  status: String,
  stripePaymentId: String,
  date: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { name, email, amount } = req.body;
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        name,
        email
      }
    });

    // Create a transaction record with 'pending' status
    const transaction = new Transaction({
      name,
      email,
      amount,
      status: 'pending',
      stripePaymentId: paymentIntent.id
    });
    
    await transaction.save();

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook handler for Stripe events
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Update transaction status to 'success'
      await Transaction.findOneAndUpdate(
        { stripePaymentId: paymentIntent.id },
        { status: 'success' }
      );
      break;
    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      // Update transaction status to 'failed'
      await Transaction.findOneAndUpdate(
        { stripePaymentId: failedIntent.id },
        { status: 'failed' }
      );
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Get transaction history
app.get('/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
