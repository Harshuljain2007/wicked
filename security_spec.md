# Wicked Firestore Security Specification

## Data Invariants
1. Public catalog collections (`/products`, `/coupons`, `/showcase`, `/banners`, `/reviews`) are read-only for customers; only verified admins can mutate catalog, coupons, showcase, or banners.
2. Customer PII (`/users/{userId}`, `/users/{userId}/addresses/{addressId}`, `/users/{userId}/wishlist/{itemId}`) is strictly isolated to the authenticated, verified owner (`request.auth.uid == userId`) or admin.
3. Users cannot self-assign admin roles or alter order payment status from the client; non-admin order updates are strictly limited to requesting a 7-day exchange when status is `delivered`.
4. All document IDs match `^[a-zA-Z0-9_\-]+$` (<= 128 chars), all strings enforce explicit `.size()` bounds, and timestamps enforce `request.time`.

## Dirty Dozen Adversarial Payloads
1. Ghost field injection on `/users/{uid}` (`isAdmin: true`, `role: "admin"`).
2. Unverified email spoof trying to write `/products` with `email_verified: false`.
3. Cross-user PII read on `/users/victim_uid/addresses/addr1`.
4. Unbounded list query on `/orders` without `userId == request.auth.uid`.
5. Oversized 1MB string injected into `review.body`.
6. Path variable poisoning (`productId = "../../admin/x"`).
7. Self-granting `verifiedBuyer: true` on `/reviews` creation without server/order proof.
8. Client trying to update `/orders/{id}` status from `placed` to `paid` directly.
9. Client creating an order with `userId` set to another user's UID.
10. Client mutating `createdAt` on update.
11. Client modifying `/admins/{uid}` to elevate privileges.
12. Terminal state mutation on a `cancelled` or `returned` order by non-admin.
