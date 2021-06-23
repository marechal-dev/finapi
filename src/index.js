const express = require('express')

const { v4: uuidV4 } = require('uuid')

const app = express()

app.use(express.json())

const customers = []

// Middlewares
// Middleware => Algo que fica no meio da requisição e da resposta
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers

  const customer = customers.find(customer => customer.cpf === cpf)

  if(!customer) {
    return response.json({ error: "Customer doesn't exists" })
  }

  request.customer = customer

  return next()
}

function verifyIfAccountHasStatements(request, response, next) {
  const { cpf } = request.headers

  const customer = customers.find(customer => customer.cpf === cpf)

  if(customer.statement.length === 0) {
    return response.json({ error: "Customer has no statements yet!" })
  }

  return next()
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if(operation.type === 'credit'){
      return acc + operation.amount
    }else {
      return acc - operation.amount
    }
  }, 0)

  return balance
}

// GET Routes
 app.get('/statement', verifyIfExistsAccountCPF, verifyIfAccountHasStatements, (request, response) => {
  const { customer } = request

  return response.json(customer.statement)
})

// POST Routes
/**
 * Data for new user:
 * 
 * CPF => String
 * Name => String
 * ID => UUID (Number)
 * statement => []
 */
app.post('/account', (request, response) => {
  const { cpf, name } = request.body

  const costumerAlreadyExists = customers.some((costumer) => costumer.cpf === cpf)
  
  if(costumerAlreadyExists) {
    return response.status(400).json({ error: "Costumer already exists!" })
  }

  customers.push({
    cpf,
    name,
    id: uuidV4(),
    statement: []
  })

  console.table(customers)
  return response.status(201).send()
})

app.post('/deposit', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body

  const { customer } = request

  const statementOperation = {
    description,
    amount: Number(amount),
    created_at: new Date(),
    type: "credit"
  }

  customer.statement.push(statementOperation)

  return response.status(201).send()
})

app.post('/withdraw', verifyIfExistsAccountCPF, (request, response) => {
  const { description, amount } = request.body
  const { customer } = request

  const balance = getBalance(customer.statement)

  if(balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" })
  }

  const statementOperation = {
    description,
    amount: Number(amount),
    created_at: new Date(),
    type: "debit"
  }

  customer.statement.push(statementOperation)

  return response.status(201).send()
})

app.get('/statement/date', verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request
  const { date } = request.query 

  const dateFormat = new Date(date + " 00:00")

  const statement = customer.statement.filter((statement) => statement.created_at.toDateString() === new Date(dateFormat).toDateString())

  return response.json(statement)
})

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body
  const { customer } = request

  customer.name = name

  console.table(customer)
  return response.status(201).send()
})

app.listen(3333, () => {
  console.log("Server running at port 3333")
})
