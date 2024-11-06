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

//const getfollowingpeopleIdofuser = async username => {
//  const getfollowingpeoplequery = `SELECT following_user_id FROM follower INNER JOIN user ON user.user_id=follower.follower_user_id
//WHERE username='${username}';`
//const followingresult = await db.all(getfollowingpeoplequery)
// return followingresult
//}

//Api 1

app.post('/register/', async (request, response) => {
  const {username, password, name, gender} = request.body
  const hashedPassword = await bcrypt.hash(password, 10)
  //console.log(hashedPassword)
  const getdbdetails = `SELECT * FROM user WHERE username='${username}';`
  const userdbresult = await db.get(getdbdetails)
  if (userdbresult === undefined) {
    if (password.length < 6) {
      const createuserquery = `INSERT INTO user(username,password,name,gender)
            VALUES('${username}','{hashedPassword}','${name}','${gender}');`
      await db.run(createuserquery)
      response.status(200)
      response.send('user created successfully')
    } else {
      response.send(400)
      response.send('Password is too short')
    }
  } else {
    response.status(400)
    response.send('user already exists')
  }
})

//api 2

app.post('/login/', accesstoken, async (request, response) => {
  const {username, password} = request.body
  //console.log(username)

  const getuserdbdetails = `SELECT * FROM user WHERE username='${username}';`
  const userdbresult = await db.get(getuserdbdetails)
  //console.log(userdbresult)
  if (userdbresult === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const ispasswordmatched = await bcrypt.compare(
      password,
      userdbresult.password,
    )
    //console.log(ispasswordmatched)
    if (ispasswordmatched === true) {
      const payload = {username: username, userId: userdbresult.user_id}
      const jwttoken = jwt.sign(payload, 'NEW_ACCESS')

      response.send({jwttoken})
    } else {
      response.status(400)
      response.send('Invalid Password')
    }
  }
})

//api 3
//app.get('/user/tweets/feed/', authenticatetoken, async (request, response) => {
//const {username} = request
//const getfollowingpeopleuserid = `SELECT following_user_id FROM follower INNER JOIN user ON user.user_id=follower.follower_user_id
// WHERE username='${username}';`
// const result = await db.run(getfollowingpeopleuserid)
//const gettweetquery = `SELECT username,tweet,date_time as dateTime FROM user INNER JOIN tweet ON user.user_id=tweet.user_id
//WHERE user.user_id='${getfollowingpeopleuserid}'ORDER BY date_time DESC LIMIT 4;
//`
//const tweetresult = await db.all(getfollowingpeopleuserid)
//response.send(tweetresult)
//})
