const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const randomWords = require('random-words');
const firebase = require('firebase/app');
require('firebase/auth');
require('firebase/database');
require('firebase/storage');

const firebaseConfig = require('./firebase_config.json');
firebase.initializeApp(firebaseConfig);
const storageRef = firebase.storage().ref();

const jwt = require('jsonwebtoken');
const jwtKey = 'my_secret_key';
const jwtExpirySeconds = 3000;

// config
app.use(express.static('src'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

// middlewares
const authenticate = (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.render('login', { message: 'User not logged in' });
    let payload = jwt.verify(token, jwtKey);
    req.user = payload.user;
    next();
  } catch (e) {
    console.log(e.message);
    return res.render('login', { message: e.message });
  }
};

const setCookie = (user, res) => {
  const token = jwt.sign({ user }, jwtKey, {
    algorithm: 'HS256',
    expiresIn: jwtExpirySeconds,
  });
  res.cookie('token', token, { maxAge: jwtExpirySeconds * 1000 });
};

// controller
const signIn = (req, res) => {
  // Get credentials from JSON body
  const { email, password, account } = req.body;
  if (!email || !password || !account) {
    return res.render('login', {
      message: 'Invalide credentials',
    });
  }

  return firebase
    .database()
    .ref('users')
    .once('value')
    .then((snapshot) => {
      const users = snapshot.val();
      let user = undefined;
      Object.keys(users).forEach((userId) => {
        if (
          users[userId].password === password &&
          users[userId].email === email &&
          users[userId].account === account
        )
          user = users[userId];
      });
      if (user) {
        setCookie(user, res);
        return res.status(200).redirect('/vote');
      } else {
        return res.render('login', { message: 'Invalide credentials' });
      }
    })
    .catch((e) => {
      console.log(e.message);
      return res.render('login', { message: e.message });
    });
};

const writeUserData = (userId, user) => {
  return firebase
    .database()
    .ref('users/' + userId)
    .set({
      userId,
      ...user,
    });
};

const updateUserData = (userId, user) => {
  return firebase
    .database()
    .ref('users/' + userId)
    .update(user);
};

const signUp = (req, res) => {
  const { email, password, account } = req.body;
  if (!email || !password || !account) {
    return res.render('signup', { message: 'Invalid body' });
  }
  let user = { userId: new Date().getTime(), email, password, account };
  let phrase = randomWords(10).join(' ');
  user.phrase = phrase;

  return firebase
    .database()
    .ref('users')
    .once('value')
    .then((snapshot) => {
      const users = snapshot.val();
      if (!users) return false;
      let exists = undefined;
      Object.keys(users).forEach((userId) => {
        if (users[userId].email === email || users[userId].account === account)
          exists = users[userId];
      });
      return !!exists;
    })
    .then((exists) => {
      if (exists)
        return res.render('signup', { message: 'Account already exists' });
      return writeUserData(user.userId, user).then(() => {
        setCookie(user, res);
        return res.status(200).redirect('/profile');
      });
    })
    .catch((e) => {
      console.log(e);
      return res.render('signup', { message: e.message });
    });
};

const updateProfile = (req, res) => {
  let { phone, address, ssn } = req.body;
  return updateUserData(req.user.userId, {
    phone,
    address,
    ssn,
    profileUpdated: true,
  })
    .then(() => {
      let imageRef = storageRef.child(`images/${req.user.userId}.jpg`);
      setCookie(
        { ...req.user, phone, address, ssn, profileUpdated: true },
        res
      );
      return res.status(200).render('profile', { message: 'Profile updated!' });
    })
    .catch((e) => {
      console.log(e.message);
      return res.render('login', { message: e.message });
    });
};

const updateVote = (req, res) => {
  if (!req.voted) {
    let { candidate } = req.body;

    return updateUserData(req.user.userId, {
      voted: candidate,
    })
      .then(() => {
        setCookie({ ...req.user, voted: candidate }, res);
        return res.status(200).send({ message: 'Vote Recorded Successfully' });
      })
      .catch((e) => {
        console.log(e.message);
        return res.render('login', { message: e.message });
      });
  }
};

// routes
app.get('/', (req, res) => res.render('login'));
app.get('/register', (req, res) => res.render('signup'));
app.get('/Election.json', (req, res) => {
  res.sendFile(__dirname + '/build/contracts/Election.json');
});
app.get('/vote', authenticate, function (req, res) {
  if (req.user.profileUpdated) {
    res.render('vote');
  } else {
    res.render('profile', { message: 'Please update your profile first' });
  }
});
app.get('/profile', authenticate, (req, res) => res.render('profile'));
app.get('/logout', (req, res) => {
  res.clearCookie('token').status(200).redirect('/');
});

app.post('/register', signUp);
app.post('/', signIn);
app.get('/user', authenticate, (req, res) => res.send(req.user));
app.post('/profile', authenticate, updateProfile);
app.post('/vote', authenticate, updateVote);

// start the server
app.listen(3000, () => console.log(`Started server at http://localhost:3000`));
