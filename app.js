const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const dbpath = path.join(__dirname, 'twitterClone.db')
const app = express()
app.use(express.json())

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
let db = null

const intitialserver = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server is running at 3000')
    })
  } catch (e) {
    console.log(`Db error '${e.message}'`)
  }
}

intitialserver()

const accesstoken = (request, response, next) => {
  let jwttoken
  const authheader = request.headers['authorization']
  if (authheader !== undefined) {
    jwttoken = authheader.split(' ')[1]
  }
  if (jwttoken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwttoken, 'NEW_ACCESS', async (err, payload) => {
      if (err) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

const userfollowingId = async username => {
  const dbquery = `SELECT following_user_id FROM follower INNER JOIN user ON user.user_id=follower.follower_user_id
  WHERE user.username='${username}';`
  const dbresult = await db.all(dbquery)
  const arrayId = dbresult.map(eachid => eachid.following_user_id)
  return arrayId
}

//Api 1

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  //console.log(hashedPassword)
  const getdbdetails = `SELECT * FROM user WHERE username='${username}';`
  const userdbresult = await db.get(getdbdetails)
  if (userdbresult !== undefined) {
    response.status(400)
    response.send('User already exists')
  } else {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      const createuserquery = `INSERT INTO user(username,password,name,gender)
                 VALUES('${username}','{hashedPassword}','${name}','${gender}');`
      await db.run(createuserquery)
      response.status(200)
      response.send('User created successfully')
    }
  }
})

//api 2

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  //console.log(username)

  const getuserdbdetails = `SELECT * FROM user WHERE username='${username}';`
  const userdbresult = await db.get(getuserdbdetails)
  //console.log(userdbresult)
  if (userdbresult !== undefined) {
    const ispasswordmatched = await bcrypt.compare(
      password,
      userdbresult.password,
    )

    if (ispasswordmatched) {
      const payload = {username: username, userId: userdbresult.user_id}
      const jwttoken = jwt.sign(payload, 'NEW_ACCESS')

      response.send({jwttoken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  } else {
    response.status(400)
    response.send('Invalid user')
  }
})

//api 3
app.get('/user/tweets/feed/', accesstoken, async (request, response) => {
  const {username} = request
  const followingpeopleIds = await userfollowingId(username)
  const dbquery = `SELECT username,tweet,date_time as dateTime FROM user INNER JOIN tweet ON user.user_id=tweet.user_id
  WHERE user.user_id='${followingpeopleIds}'ORDER BY date_time DESC LIMIT 4;`
  const tweets = await db.all(dbquery)
  response.send(tweets)
})

//api 4
app.get('/user/following/', accesstoken, async (request, response) => {
  const {username, userId} = request
  const dbquery = `SELECT name FROM follower INNER JOIN user ON user.user_id=follower.following_user_id
  WHERE follower_user_id='${userId}';`
  const result = await db.all(dbquery)
  response.send(result)
})

//api 5
app.get('/user/followers/', accesstoken, async (request, response) => {
  const {username, userId} = request
  const dbquery = `SELECT DISTINCT name FROM follower INNER JOIN user ON user.user_id=follower.follower_user_id
 WHERE following_user_id='${userId}';`
  const result = await db.all(dbquery)
  response.send(result)
})

module.exports = app
