const http = require('http')
const fs = require('fs')
const crypto = require('crypto')

// File to store balance and game history
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

// ✅ Function to read balance and history from data.json
function readData() {
  // ✅ Check if file exists, if not create one
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      balance: 1000,
      history: [],
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData))
    return initialData
  }

  // ✅ Read the file data
  const data = fs.readFileSync(DATA_FILE)
  return JSON.parse(data)
}

// ✅ Function to update balance and history in data.json
function updateData(balance, history) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ balance, history }))
}

// ✅ Create HTTP server
const server = http.createServer((req, res) => {
  // ✅ Enable CORS manually
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // ✅ Handle Preflight Request (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // ✅ API: Roll Dice
  if (req.method === 'POST' && req.url === '/roll-dice') {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      const { bet } = JSON.parse(body)

      // ✅ Read current balance and history
      let { balance, history } = readData()

      // ✅ Ensure history array always exists
      if (!history) history = []

      // ✅ Check if the bet is valid
      if (bet > balance || bet <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid Bet' }))
        return
      }

      // ✅ Generate random roll
      const roll = getRandomRoll()
      const serverSeed = 'secret-server-seed'
      const clientSeed = 'user-client-seed'
      const nonce = Math.random().toString()
      const hash = generateHash(serverSeed, clientSeed, nonce)

      // ✅ Determine win/lose
      let win = false
      if (roll >= 4) {
        balance += bet
        win = true
      } else {
        balance -= bet
      }

      // ✅ Push game history without crashing
      history.push({
        roll,
        bet,
        win,
        newBalance: balance,
        hash,
        serverSeed,
        clientSeed,
        nonce,
        timestamp: new Date().toISOString(),
      })

      // ✅ Update balance and history
      updateData(balance, history)

      // ✅ Send response
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
  }

  // ✅ API: Get Game History
  else if (req.method === 'GET' && req.url === '/game-history') {
    const { history } = readData()

    // ✅ If history doesn't exist, send empty array
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(history || []))
  }

  // ✅ API: Get Balance
  else if (req.method === 'GET' && req.url === '/balance') {
    const { balance } = readData()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ balance }))
  }

  // ✅ Handle Invalid Routes
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not Found' }))
  }
})

// ✅ Start server
server.listen(4000, () => {
  console.log('✅ Server running at http://localhost:4000')
})
