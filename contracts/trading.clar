;; Trading Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-unauthorized (err u102))
(define-constant err-insufficient-balance (err u103))

;; Data Maps
(define-map listings
  { listing-id: uint }
  {
    seller: principal,
    amount: uint,
    price: uint
  }
)

(define-map user-balances
  { user: principal }
  { balance: uint }
)

;; Data Variables
(define-data-var listing-nonce uint u0)

;; Public Functions

;; List carbon credits for sale
(define-public (list-carbon-credits (amount uint) (price uint))
  (let
    (
      (listing-id (var-get listing-nonce))
    )
    (map-set listings
      { listing-id: listing-id }
      {
        seller: tx-sender,
        amount: amount,
        price: price
      }
    )
    (var-set listing-nonce (+ listing-id u1))
    (ok listing-id)
  )
)

;; Buy carbon credits
(define-public (buy-carbon-credits (listing-id uint))
  (let
    (
      (listing (unwrap! (map-get? listings { listing-id: listing-id }) err-not-found))
      (buyer-balance (default-to { balance: u0 } (map-get? user-balances { user: tx-sender })))
      (seller-balance (default-to { balance: u0 } (map-get? user-balances { user: (get seller listing) })))
    )
    (asserts! (>= (get balance buyer-balance) (get price listing)) err-insufficient-balance)
    (map-set user-balances
      { user: tx-sender }
      { balance: (- (get balance buyer-balance) (get price listing)) }
    )
    (map-set user-balances
      { user: (get seller listing) }
      { balance: (+ (get balance seller-balance) (get price listing)) }
    )
    (map-delete listings { listing-id: listing-id })
    (ok true)
  )
)

;; Read-only Functions

;; Get listing details
(define-read-only (get-listing (listing-id uint))
  (ok (unwrap! (map-get? listings { listing-id: listing-id }) err-not-found))
)

;; Get user balance
(define-read-only (get-user-balance (user principal))
  (ok (default-to { balance: u0 } (map-get? user-balances { user: user })))
)

;; Initialize contract
(begin
  (var-set listing-nonce u0)
)

