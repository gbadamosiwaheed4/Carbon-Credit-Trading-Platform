;; Carbon Credit Issuance Contract

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-verified (err u102))

;; Data Variables
(define-data-var total-credits-issued uint u0)

;; Data Maps
(define-map carbon-credits
  { credit-id: uint }
  {
    owner: principal,
    amount: uint,
    verified: bool,
    project-id: uint
  }
)

;; Public Functions

;; Issue new carbon credits
(define-public (issue-carbon-credits (amount uint) (project-id uint))
  (let
    (
      (credit-id (var-get total-credits-issued))
    )
    (map-set carbon-credits
      { credit-id: credit-id }
      {
        owner: tx-sender,
        amount: amount,
        verified: false,
        project-id: project-id
      }
    )
    (var-set total-credits-issued (+ credit-id u1))
    (ok credit-id)
  )
)

;; Verify carbon credits
(define-public (verify-carbon-credits (credit-id uint))
  (let
    (
      (credit (unwrap! (map-get? carbon-credits { credit-id: credit-id }) err-not-found))
    )
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (not (get verified credit)) err-already-verified)
    (ok (map-set carbon-credits
      { credit-id: credit-id }
      (merge credit { verified: true })
    ))
  )
)

;; Read-only Functions

;; Get carbon credit details
(define-read-only (get-carbon-credit (credit-id uint))
  (ok (unwrap! (map-get? carbon-credits { credit-id: credit-id }) err-not-found))
)

;; Get total credits issued
(define-read-only (get-total-credits-issued)
  (ok (var-get total-credits-issued))
)

;; Initialize contract
(begin
  (var-set total-credits-issued u0)
)

