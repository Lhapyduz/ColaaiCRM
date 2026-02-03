import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-01-28.clover', // Verified stable version
  typescript: true,
});

export const getStripeCustomer = async (userId: string, email: string, name?: string) => {
  // First try to find existing customer by userId metadata
  const { data: customers } = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
  });

  if (customers.length > 0) {
    // Verify the customer still exists and is not deleted
    try {
      const customer = await stripe.customers.retrieve(customers[0].id);
      if (customer && !customer.deleted) {
        return customer;
      }
    } catch (error) {
      console.log('[STRIPE] Customer not found in Stripe, creating new one');
    }
  }

  // Create new customer if not found or deleted
  return stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
};
