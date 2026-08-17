# PayFast E2E Test Plan

Goal: Validate order creation → payment initiation → PayFast IPN → order status update.

Environments:
- Staging with sandbox PayFast credentials and test merchant account.

Test Steps:
1. Create a test user (API or seeded fixture) and sign in.
2. Navigate to `/customer/new-order`, fill required fields and submit.
3. Intercept the call to `/api/payment/create` and capture the returned `paymentId` and `redirectUrl`.
4. Simulate the PayFast client flow by calling `/api/payment/notify` with a signed payload (IPN).
5. Assert the payment record status becomes `COMPLETE` and the order `paymentStatus`/`status` is updated.
6. Fetch the order detail page and confirm invoice/download is accessible at `/customer/orders/:id/invoice`.

Notes:
- Implement fixtures for creating test users and cleaning up test orders.
- Use Playwright for E2E; run tests against a disposable staging database.
- If PayFast sandbox is unavailable, emulate IPN calls directly to the notify endpoint.
