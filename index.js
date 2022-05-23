const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

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

    app.get('/parts', async (req, res) => {
      const result = await partsCollection.find().toArray();
      const parts = result.reverse();
      res.send(parts);
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