const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jtchhsy.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const taskCollection = client.db("FlowtaskDB").collection("tasks");
    const userCollection = client.db("FlowtaskDB").collection("users");

    // middleware
    const verifyToken = (req, res, next)=>{
        console.log('inside verify token',req.headers.authorization);
        if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
        }
        const token = req.headers.authorization.split(' ')[1]
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=> {
        if(err){
            return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded
        next()
        });
    }

    // jwt api
    app.post('/jwt', async(req, res)=>{
        const user = req.body
        const token =  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        })
        res.send({token})
    })

    // todo API
    app.post('/tasks',verifyToken, async(req, res)=>{
      const task = req.body  
      const result = await taskCollection.insertOne(task)
      res.send(result)
    })
    app.get('/tasks/:email',verifyToken,  async(req, res)=>{
      const email=req.params.email;
      const filter = {email: email}
      const result = await taskCollection.find(filter).toArray()
      res.send(result)
    })
    app.patch('/tasks/:id',verifyToken,  async(req, res)=>{
      const task = req.body
      const id = req.params.id
      const filter= {_id: new ObjectId(id)}
      const updatedtask = {
        $set:{
          status: task.status,
        }
      }
      const result = await taskCollection.updateOne(filter, updatedtask)
      res.send(result)
    })

    // user api
    app.get('/users/:email',verifyToken, async(req, res)=>{
        const email=req.params.email;
        const query = {email: email}
        const result = await userCollection.findOne(query)
        res.send(result)
    })
    
    app.post('/users', async(req, res)=>{
        const user = req.body
        // insert email if user doesn't exists(social login)
        const query = {email: user.email}
        const isExist = await userCollection.findOne(query)
        if(isExist){
            return res.send({message:'user already exists', insertedId: null})
        }
        const result = await userCollection.insertOne(user)
        res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('TaskFlow is booming')
})
app.listen(port, ()=>{
    console.log(`TaskFlow is running on port ${port}`);
})