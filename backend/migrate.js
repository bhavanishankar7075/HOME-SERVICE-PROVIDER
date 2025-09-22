const mongoose = require('mongoose');
const Plan = require('./models/Plan');
const stripe = require('stripe')('sk_test_51PwKUJL4Eh51qnT6ELLRA7Gz4dU6mdeS5FT3FIf2Op7VMGoNaEBAZVz8a9R1ajWO9uF9DiFBq2cm9pLJW1ntlKMy00gmjWPI8J');

async function migratePlans() {
  await mongoose.connect('mongodb+srv://home-service-provider:homeserviceprovider@cluster0.dzfuatk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
  const plans = await Plan.find({ stripeProductId: { $exists: false } });
  
  for (const plan of plans) {
    try {
      const price = await stripe.prices.retrieve(plan.stripePriceId);
      plan.stripeProductId = price.product;
      await plan.save();
      console.log(`Updated plan ${plan._id} with product ID ${price.product}`);
    } catch (error) {
      console.error(`Failed to update plan ${plan._id}:`, error.message);
    }
  }
  
  mongoose.disconnect();
}

migratePlans();