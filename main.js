const express = require('express');

const app = express()
const PORT = 3000

app.use(express.json())

app.listen(PORT, (req, res)=>{
    res.send("backend is live.")
})