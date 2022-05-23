const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// use middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7jttl.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
  try{
    await client.connect();

    const partsCollection = client.db('comTechUser').collection('parts');
    const ordersCollection = client.db('comTechUser').collection('orders');

    app.get('/parts', async (req, res) => {
      const result = await partsCollection.find().toArray();
      const parts = result.reverse();
      res.send(parts);
    });
    app.get('/parts/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const part = await partsCollection.findOne(query);
      res.send(part);
    });

    // orders api

    app.post('/orders', async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });

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
  finally{}
}

run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello from manufacturer website')
})

app.listen(port, () => {
  console.log(`Manufacturer app listening on port ${port}`)
})