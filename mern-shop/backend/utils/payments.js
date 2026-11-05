import Stripe from 'stripe';
export function getSandboxStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith('sk_test_') || key === 'sk_test_placeholder') {
    const error = new Error('Sandbox payments are not configured. A Stripe test secret key is required.');
    error.code = 'PAYMENTS_UNCONFIGURED';
    throw error;
  }
  return new Stripe(key);
}
export function checkoutParams(order, email) {
  const amount = Math.round(order.totalPrice * 100);
  if (!Number.isSafeInteger(amount) || amount < 50) throw new Error('Invalid order total');
  const origin = new URL(process.env.CLIENT_URL || 'http://localhost:5173').origin;
  return {
    payment_method_types: ['card'], mode: 'payment', customer_email: email,
    success_url: `${origin}/order/${order._id}?success=true`,
    cancel_url: `${origin}/order/${order._id}?cancelled=true`,
    line_items: [{ price_data: { currency: 'usd', product_data: {
      name: `L4LStore sandbox order ${order._id}`,
      description: 'Order total including items, shipping and tax. Test payment only.',
    }, unit_amount: amount }, quantity: 1 }],
    metadata: { orderId: order._id.toString() },
  };
}
export function validPaidSession(session, order) {
  return session.livemode === false && session.mode === 'payment' && session.payment_status === 'paid'
    && session.currency === 'usd' && session.amount_total === Math.round(order.totalPrice * 100)
    && session.id === order.stripeSessionId && session.metadata?.orderId === order._id.toString();
}
