const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tn9l1.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const servicesCollection = client
      .db("Drill_machine_tool")
      .collection("Services");
    const purchaseCollection = client
      .db("Drill_machine_tool")
      .collection("purchase");

    // get service tool home page
    app.get("/service", async (req, res) => {
      const service = await servicesCollection.find().toArray();
      res.send(service);
    });

    //get purchase
    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const service = await servicesCollection.findOne(query);
      res.send(service);
    });

    //get per my purchase
    app.get("/purchase", async (req, res) => {
      const clientEmail = req.query.clientEmail;
      const query = { clientEmail: clientEmail };
      const purchase = await purchaseCollection.find(query).toArray();
      res.send(purchase);
     
    });

    //purchase post
    app.post("/purchase", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      res.send(result);
      console.log(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Drill Machine Tools!");
});

app.listen(port, () => {
  console.log(`listening on port ready${port}`);
});
