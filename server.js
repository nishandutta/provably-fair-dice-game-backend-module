const http = require('http')
const fs = require('fs')
const crypto = require('crypto')

// File to store balance
const DATA_FILE = './data.json'

// Function to get random dice roll
function getRandomRoll() {
  return Math.floor(Math.random() * 6) + 1
}

// Function to generate SHA-256 hash (Provably Fair)
function generateHash(serverSeed, clientSeed, nonce) {
  const hash = crypto.createHash('sha256')
  hash.update(serverSeed + clientSeed + nonce)
  return hash.digest('hex')
}

// Function to read balance from data.json
function readBalance() {
  const data = fs.readFileSync(DATA_FILE)
  return JSON.parse(data).balance
}

// Function to update balance in data.json
function updateBalance(balance) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ balance }))
}

// Create server
const server = http.createServer((req, res) => {
  // ✅ Enable CORS manually
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle Preflight Request (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'POST' && req.url === '/roll-dice') {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      const { bet } = JSON.parse(body)

      // Read current balance
      let balance = readBalance()

      if (bet > balance || bet <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid Bet' }))
        return
      }

      // Generate random roll
      const roll = getRandomRoll()
      const serverSeed = 'secret-server-seed'
      const clientSeed = 'user-client-seed'
      const nonce = Math.random().toString()
      const hash = generateHash(serverSeed, clientSeed, nonce)

      let win = false
      if (roll >= 4) {
        balance += bet
        win = true
      } else {
        balance -= bet
      }

      // Update balance
      updateBalance(balance)

      // Send response
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          roll,
          win,
          newBalance: balance,
          hash,
        })
      )
    })
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
})

// Start server
server.listen(4000, () => {
  console.log('Server running at http://localhost:4000')
})
