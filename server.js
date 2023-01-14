//-------------------------------------------------------------------------------------------------------------------------------------------------//

require('dotenv').config();

const pug = require("pug");
const path = require("path");
const morgan = require("morgan");
const express = require("express");
const fsPromises = require("fs").promises;
const session = require('express-session');
const app = express();

const {
    userGet,
    userLogin,
    userCreate,
    userUpdate,
    addArtwork,
    getArtwork,
    getArtworks,
    deleteArtwork,
    updateArtwork,
    resetMongoDB,
    getArtworksByArtist,
    getArtworksByAllFields,
    readDataAndInitMongoDB,
}
    = require('./database');

app.use(session({ resave: true, secret: 'secret_key', saveUninitialized: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.static(path.join(__dirname, "/public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

const Port = process.env.A5_PORT || 4000;
const Pass = { Result: "PASS" };
const Fail = { Result: "FAIL" };

//---------------Auth--------------------------//

app.get("*", auth, (req, res, next) => {
    next();
})

//---------------Home--------------------------//

app.get("/", (req, res) => {
    const username = req.session.username;
    res.render("home", { username });
})

//---------------Artist------------------------//

app.get("/artists/:id", async (req, res) => {
    const artist = req.params.id;
    const username = req.session.username;
    const items = await getArtworksByArtist(artist);
    res.format({
        html: () => res.render("artist", { items, artist, username }),
        json: () => res.json({ "artist": items })
    });
})

//---------------Artworks---------------------//

app.get("/artworks", async (req, res) => {
    const items = await getArtworks();
    const username = req.session.username;
    res.format({
        html: () => res.render("artworks", { items, username }),
        json: () => res.json({ "artworks": items })
    });
})

app.post("/artworks/find", async (req, res) => {

    const filter = req.body;
    const username = req.session.username;

    if (Object.keys(filter).length === 0) {
        const items = await getArtworks();
        res.render("artworks", { items, username });
    }
    else {
        const items = await getArtworksByAllFields(filter);
        res.render("artworks", { items, username });
    }
})

app.get("/artworks/:id", async (req, res) => {
    const id = req.params.id;
    const item = await getArtwork(id);
    const username = req.session.username;
    res.format({
        html: () => res.render("artwork", { item, username }),
        json: () => res.json({ "artwork": item })
    });
})

app.put("/artworks", async (req, res) => {
    const item = req.body;
    const result = await updateArtwork(item);
    res.status(200).send(result);
})

app.post("/artworks", async (req, res) => {
    const item = req.body;
    const result = await addArtwork(item);
    result.acknowledged ? res.status(200).send(result) : res.status(400).send(JSON.stringify(result.message));
})

app.delete("/artworks/:id", async (req, res) => {
    const id = req.params.id;
    if (!id) {
        return res.status(404).send("Invalid Item Id !");
    }
    const result = await deleteArtwork(id);
    res.status(200).send(result);
})

//---------------User---------------------------//

app.get("/userget", async (req, res) => {
    const username = req.session.username;
    const user = await userGet(username);
    (user == null) ? res.render("login", {}) : res.render("user", { user });
})

app.post("/userlike/:id", async (req, res) => {
    const artwork = await getArtwork(req.params.id);
    const user = await userGet(req.session.username);

    if (artwork.Likes.indexOf(user._id.toString()) < 0) artwork.Likes.push(user._id.toString());
    if (user.Likes.indexOf(artwork._id.toString()) < 0) user.Likes.push(artwork._id.toString());

    const result1 = await userUpdate(user);
    const result2 = await updateArtwork(artwork);

    result1.acknowledged && result2.acknowledged ? res.status(200).send(Pass) : res.status(400).send(Fail);
})

app.post("/userunlike/:id", async (req, res) => {
    const artwork = await getArtwork(req.params.id);
    const user = await userGet(req.session.username);

    removeItem(artwork.Likes, user._id.toString());
    removeItem(user.Likes, artwork._id.toString());

    const result1 = await userUpdate(user);
    const result2 = await updateArtwork(artwork);

    result1.acknowledged && result2.acknowledged ? res.status(200).send(Pass) : res.status(400).send(Fail);
})

app.post("/userupdate", async (req, res) => {
    const filter = req.body;
    const user = await userGet(filter.Username);
    filter.Follows = user.Follows;
    filter.Likes = user.Likes;
    const result = await userUpdate(filter);
    result.acknowledged ? res.status(200).send(Pass) : res.status(400).send(Fail);
})

app.post("/usercreate", async (req, res) => {
    const filter = req.body;
    const result = await userCreate(filter);
    result.acknowledged ? res.status(200).send(Pass) : res.status(400).send(Fail);
})

app.post("/userfollow/:artist", async (req, res) => {
    const artist = req.params.artist;
    const username = req.session.username;
    const user = await userGet(username);
    if (user.Follows.indexOf(artist) < 0) user.Follows.push(artist);
    const result = await userUpdate(user);
    result.acknowledged ? res.status(200).send(Pass) : res.status(400).send(Fail);
})

app.post("/userunfollow/:artist", async (req, res) => {
    const artist = req.params.artist;
    const username = req.session.username;
    const user = await userGet(username);
    user.Follows = user.Follows.filter(x => x !== artist);
    const result = await userUpdate(user);
    result.acknowledged ? res.status(200).send(Pass) : res.status(400).send(Fail);
})

app.get("/userlogin", (req, res) => {
    const username = req.session.username;
    req.session.loggedin ? res.render("home", { username }) : res.render("login", {});
})

app.post("/userlogin", async (req, res) => {
    const filter = req.body;
    const result = await userLogin(filter);
    if (result != null) {
        req.session.loggedin = true;
        req.session.username = filter.Username;
        res.status(200).send(Pass);
    }
    else {
        res.status(400).send(Fail);
    }
})

app.post("/userlogout", async (req, res) => {
    req.session.username = "";
    req.session.loggedin = false;
    res.status(200).send(Pass);
})

//---------------Reset MongoDB--------------------//

app.post("/resetdb", async (req, res) => {
    const res1 = await resetMongoDB();
    const res2 = await readDataAndInitMongoDB();
    (res1 && res2) ? res.status(200).send(Pass) : res.status(400).send(Fail);
})

//-------------------------------------------------------------------------------------------------------------------------------------------------//

function removeItem(array, value) {
    var index = array.indexOf(value);
    if (index > -1) {
        array.splice(index, 1);
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

function auth(req, res, next) {
    if (!req.session.loggedin) {
        res.render("login", {});
        return;
    }
    next();
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

async function readDataAndStartWebServer() {
    try {
        await readDataAndInitMongoDB();
        app.listen(Port, () => console.log(`Express WebServer ............ ==> http://localhost:${Port}`));
    }
    catch (err) {
        console.log(err)
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

readDataAndStartWebServer();

//-------------------------------------------------------------------------------------------------------------------------------------------------//