import { describe, it, expect, beforeEach } from "vitest"

// Mock the Clarity functions and types
const mockClarity = {
  tx: {
    sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  },
  types: {
    uint: (value: number) => ({ type: "uint", value }),
    principal: (value: string) => ({ type: "principal", value }),
  },
}

// Mock contract state
let listingNonce = 0
const listings = new Map()
const userBalances = new Map()

// Mock contract calls
const contractCalls = {
  "list-carbon-credits": (amount: number, price: number) => {
    const listingId = listingNonce++
    listings.set(listingId, {
      seller: mockClarity.tx.sender,
      amount: mockClarity.types.uint(amount),
      price: mockClarity.types.uint(price),
    })
    return { success: true, value: mockClarity.types.uint(listingId) }
  },
  "buy-carbon-credits": (listingId: number) => {
    const listing = listings.get(listingId)
    if (!listing) {
      return { success: false, error: "err-not-found" }
    }
    
    const buyerBalance = userBalances.get(mockClarity.tx.sender) || { balance: mockClarity.types.uint(0) }
    const sellerBalance = userBalances.get(listing.seller.value) || { balance: mockClarity.types.uint(0) }
    
    if (buyerBalance.balance.value < listing.price.value) {
      return { success: false, error: "err-insufficient-balance" }
    }
    
    buyerBalance.balance.value -= listing.price.value
    sellerBalance.balance.value += listing.price.value
    
    userBalances.set(mockClarity.tx.sender, buyerBalance)
    userBalances.set(listing.seller.value, sellerBalance)
    
    listings.delete(listingId)
    
    return { success: true, value: true }
  },
  "get-listing": (listingId: number) => {
    const listing = listings.get(listingId)
    if (!listing) {
      return { success: false, error: "err-not-found" }
    }
    return { success: true, value: listing }
  },
  "get-user-balance": (user: string) => {
    const balance = userBalances.get(user) || { balance: mockClarity.types.uint(0) }
    return { success: true, value: balance }
  },
}

describe("Trading Contract", () => {
  beforeEach(() => {
    listingNonce = 0
    listings.clear()
    userBalances.clear()
    // Set initial balance for the test user
    userBalances.set(mockClarity.tx.sender, { balance: mockClarity.types.uint(10000) })
  })
  
  it("should list carbon credits for sale", () => {
    const result = contractCalls["list-carbon-credits"](50, 1000)
    expect(result.success).toBe(true)
    expect(result.value).toEqual(mockClarity.types.uint(0))
    
    const listing = listings.get(0)
    expect(listing).toBeDefined()
    expect(listing.amount).toEqual(mockClarity.types.uint(50))
    expect(listing.price).toEqual(mockClarity.types.uint(1000))
  })
  
  it("should get listing details", () => {
    contractCalls["list-carbon-credits"](50, 1000)
    const result = contractCalls["get-listing"](0)
    expect(result.success).toBe(true)
    expect(result.value).toEqual({
      seller: mockClarity.types.principal(mockClarity.tx.sender),
      amount: mockClarity.types.uint(50),
      price: mockClarity.types.uint(1000),
    })
  })
  
  it("should return error when getting non-existent listing", () => {
    const result = contractCalls["get-listing"](999)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
  
  it("should buy carbon credits", () => {
    contractCalls["list-carbon-credits"](50, 1000)
    const result = contractCalls["buy-carbon-credits"](0)
    expect(result.success).toBe(true)
    expect(result.value).toBe(true)
    
    // Check that the listing was removed
    expect(listings.size).toBe(0)
    
    // Check that balances were updated correctly
    const buyerBalance = userBalances.get(mockClarity.tx.sender)
    expect(buyerBalance.balance.value).toBe(9000)
  })
  
  it("should fail to buy carbon credits with insufficient balance", () => {
    contractCalls["list-carbon-credits"](50, 20000)
    const result = contractCalls["buy-carbon-credits"](0)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-insufficient-balance")
    
    // Check that the listing still exists
    expect(listings.size).toBe(1)
  })
  
  it("should fail to buy non-existent listing", () => {
    const result = contractCalls["buy-carbon-credits"](999)
    expect(result.success).toBe(false)
    expect(result.error).toBe("err-not-found")
  })
  
  it("should get user balance", () => {
    const result = contractCalls["get-user-balance"](mockClarity.tx.sender)
    expect(result.success).toBe(true)
    expect(result.value).toEqual({ balance: mockClarity.types.uint(10000) })
  })
  
  it("should return zero balance for new user", () => {
    const newUser = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    const result = contractCalls["get-user-balance"](newUser)
    expect(result.success).toBe(true)
    expect(result.value).toEqual({ balance: mockClarity.types.uint(0) })
  })
})

