const express = require("express")
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require("cookie-parser")
const Port = process.env.Port || 5000
require("dotenv").config()
const app = express()


app.use(express())
app.use(cors({
  origin:[
    'http://localhost:5173',
    "https://jobayer-blogs.web.app",
    "https://jobayer-blogs.firebaseapp.com"
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const verifySecret =(req, res, next) =>{
  const token = req.cookies?.token
  if(!token){
    return res.status(401).send({messsgae:"unauthorize"})
  }
  jwt.verify(token, process.env.AUTH_SECRET, (err, decoded)=>{
    if (err) {
      return res.status(403).send({message:"Not valod"})
    }
    // console.log(decoded.email.length);
    req.user = decoded
    next();
  })
  // next()
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w7xbhfw.mongodb.net/?retryWrites=true&w=majority`;

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
    // Send a ping to confirm a successful connection

    const BlogUsers = client.db("JobayerBlogs").collection("users")
    const JobayerBlogs = client.db("JobayerBlogs").collection("blogs")
    const BookMarkBlogs = client.db("JobayerBlogs").collection("bookmakrBlogs")



    // token
    app.post("/jwt", async( req, res)=>{
      const userData = req.body
      const token = jwt.sign(userData, process.env.AUTH_SECRET, {expiresIn:"4h"} )
      console.log(token)
      res.
      cookie("token", token,{
        httpOnly:true,
        secure:true,
        sameSite:"none"
      })
      .send({status:"Auth granted"})
    })

    app.post('/logout', async(req, res)=>{
      const userData = req.body
      console.log(userData);
      res
      .clearCookie("token", {maxAge:0}) 
      .send({status:"Sucess"})
    })

    // lets Check if the user is admin or not
    app.get("/user/admin",  async(req,res)=>{
      const email = req.query.email
      // if (email !== req.decoded.email ) {
      //   return {status:"unAuthorized"}
      // }
      const query = {email: email}
      const result = await BlogUsers.findOne(query)
      let isAdmin = ""
      if (result?.role === "Admin") {
        isAdmin = true
      }
      else{
        isAdmin = false
      }
      res.send({isAdmin})

    })

    //user List
    app.get("/user", async(req, res)=>{
      let query ={}
      if (req.query?.email) {
        query = {email:req.query.email}
      }
      const user = BlogUsers.find(query)
      const result = await user.toArray()
      res.send(result)
    })


    app.post("/user", async(req, res)=>{
      const user = req.body;
      const result = await BlogUsers.insertOne(user)
      res.send(result)
    })


    // ports for blogs

    app.get("/blogs", async(req, res)=>{
      const search = req.query.search
      let query ={}
      if (req.query?.search) {
        query = {
          name: {$regex:search, $options: "i" }
        }
      }
      console.log(search);
      const blogs = JobayerBlogs.find(query)
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)
      // console.log(page, size);
      const result = await blogs
      .skip(page * size)
      .limit(size)
      .toArray()
      res.send(result)
    })

    app.get("/blogcount", async(req, res)=>{
      const count = await JobayerBlogs.estimatedDocumentCount()
      res.send({count})
    })

    
    app.get("/blogs/:id", async(req, res)=>{
      const id = req.params.id
      const filter = {_id : new ObjectId(id)}
      const blogs = JobayerBlogs.find(filter)
      const result = await blogs.toArray()
      res.send(result)
    })

    app.post("/blogs", async(req, res)=>{
      const Blog = req.body;
      const result = await JobayerBlogs.insertOne(Blog)
      res.send(result)
    })

    app.put("/blog/:id", async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const option = {upsert:true}
      const UpdaterBlog = req.body
      const blog ={
        $set:{
          name: UpdaterBlog.name,
          blogData: UpdaterBlog.blogData,
          data: UpdaterBlog.data,
          Author: UpdaterBlog.Author
        }
      }
      const result = await JobayerBlogs.updateOne(filter, blog, option)
      res.send(result)
    })

    app.delete("/blog/:id", async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const result = await JobayerBlogs.deleteOne(filter)
      res.send(result) 
    })

    // Bookmark blogs

    app.get("/bookmark", verifySecret, async(req, res)=>{
      if (req.user.email !== req.query.email ) {
        return res.send({status:"forbidden"})
      }
      let query = {}
      if (req.query?.email) {
        query = {email:req.query.email}
      }
      const blog =  BookMarkBlogs.find(query)
      const result = await blog.toArray()
      res.send(result)
    })
    app.get("/bookmark/:id",async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const blog =  BookMarkBlogs.find(filter)
      const result = await blog.toArray()
      res.send(result)
    })

    app.post("/bookmark",async(req, res)=>{
      const BookmarkedData = req.body
      const result = await BookMarkBlogs.insertOne(BookmarkedData)
      res.send(result)
    })

    app.delete("/bookmark/:id",async(req, res)=>{
      const id = req.params.id
      const filter = {_id: new ObjectId(id)}
      const result = await BookMarkBlogs.deleteOne(filter)
      res.send(result)
    })





    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/",(req, res)=>{
    res.send("I am a blog server")
})


app.listen(Port, ()=>{console.log(`i am running at ${Port}`);})