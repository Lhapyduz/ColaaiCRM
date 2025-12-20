import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2025-12-15.clover', // Use latest stable version or '2023-10-16' if safer
  typescript: true,
});

export const getStripeCustomer = async (userId: string, email: string, name?: string) => {
  const { data: customers } = await stripe.customers.search({
    query: `metadata['userId']:'${userId}'`,
  });

  if (customers.length > 0) {
    return customers[0];
  }

  // Create new customer if not found
  return stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
};
