const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const app = express();
const port = process.env.PORT || 5000;

// use middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7jttl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'unAuthorized Access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();

    const partsCollection = client.db('comTechUser').collection('parts');
    const ordersCollection = client.db('comTechUser').collection('orders');
    const userCollection = client.db('comTechUser').collection('users');
    const paymentCollection = client.db('comTechUser').collection('payments');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden access' })
      }
    }

    app.get('/parts', async (req, res) => {
      const result = await partsCollection.find().toArray();
      const parts = result.reverse();
      res.send(parts);
    });

    app.get('/parts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const part = await partsCollection.findOne(query);
      res.send(part);
    });

    // user create api
    app.get('/user', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.put('/user/admin/:email', async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc)
    });

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
      res.send({ result, token });
    })

    // orders api

    app.get('/orders', verifyJWT, async (req, res) => {
      const userEmail = req.query.userEmail;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const orders = await ordersCollection.find(query).toArray();
        res.send(orders);
      }
      else {
        res.status(403).send({ message: 'forbidden access' })
      }
    });

    app.get('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    })

    app.post('/orders', async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });

    app.patch('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedOrders = await ordersCollection.updateOne(filter, updateDoc);

      res.send(updateDoc);
    })

    app.delete('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const result = await ordersCollection.deleteOne(filter);
      res.send(result);
    })

    // payment api
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    })

    // use put update quantity
    app.put('/updateQuantity/:id', async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          availableQuantity: data.updatedQuantity,
        }
      }
      const result = await partsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
      console.log(data)
    })

  }
  finally { }
}

run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello from manufacturer website')
})

app.listen(port, () => {
  console.log(`Manufacturer app listening on port ${port}`)
})